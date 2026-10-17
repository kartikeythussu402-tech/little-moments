import { test } from "node:test";
import assert from "node:assert/strict";
import { SheetsHttpError, type SheetsApi } from "../lib/sheets/google";
import { toCells, WORKSHEETS, type Row, type SheetName } from "../lib/sheets/schema";
import { backoff, drain, ensureWorksheets, MAX_ATTEMPTS, type OutboxEvent, type SyncStore } from "../lib/sheets/sync";

/* ───────── In-memory fake of the Google Sheets API ───────── */
class FakeSheets implements SheetsApi {
  data = new Map<string, string[][]>();
  failNext = 0;
  calls: string[] = [];
  private maybeFail(op: string) {
    this.calls.push(op);
    if (this.failNext > 0) {
      this.failNext--;
      throw new SheetsHttpError("Google Sheets 503: backend unavailable", 503);
    }
  }
  private parse(range: string) {
    const m = range.match(/^'(.+)'!([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/);
    if (!m) throw new Error(`bad range ${range}`);
    return { sheet: m[1].replaceAll("''", "'"), row: m[3] ? Number(m[3]) : null };
  }
  async listSheets() {
    this.maybeFail("list");
    return [...this.data.keys()];
  }
  async addSheets(titles: string[]) {
    if (!titles.length) return;
    this.maybeFail("add");
    titles.forEach((t) => this.data.set(t, []));
  }
  async getRange(range: string) {
    this.maybeFail("get");
    const { sheet, row } = this.parse(range);
    const rows = this.data.get(sheet) ?? [];
    return row ? (rows[row - 1] ? [rows[row - 1]] : []) : rows.map((r) => [...r]);
  }
  async updateRanges(data: Array<{ range: string; values: string[][] }>) {
    if (!data.length) return;
    this.maybeFail("update");
    for (const d of data) {
      const { sheet, row } = this.parse(d.range);
      const rows = this.data.get(sheet)!;
      while (rows.length < row!) rows.push([]);
      rows[row! - 1] = [...d.values[0]];
    }
  }
  async append(sheet: SheetName, rows: string[][]) {
    if (!rows.length) return;
    this.maybeFail("append");
    this.data.get(sheet)!.push(...rows.map((r) => [...r]));
  }
  rows(sheet: SheetName) {
    return (this.data.get(sheet) ?? []).slice(1);
  }
}

/* ───────── In-memory fake of the outbox store ───────── */
class FakeStore implements SyncStore {
  events: Array<OutboxEvent & { status: string; last_error?: string }> = [];
  users = new Map<string, Row>();
  gifts = new Map<string, Row & { body?: string }>();
  contacts = new Map<string, Row>();
  private n = 0;
  enqueue(event_type: string, entity_key: string, payload: Record<string, unknown> = {}) {
    this.events.push({ id: `ev${++this.n}`, event_type, entity_key, payload, attempts: 0, created_at: new Date(2026, 9, 12, 10, 0, this.n).toISOString(), status: "pending" });
  }
  async claim(limit: number) {
    const due = this.events.filter((e) => e.status === "pending" || e.status === "failed").slice(0, limit);
    due.forEach((e) => {
      e.status = "processing";
      e.attempts++;
    });
    return due.map((e) => ({ ...e }));
  }
  async markSynced(ids: string[]) {
    this.events.filter((e) => ids.includes(e.id)).forEach((e) => (e.status = "synced"));
  }
  async markFailed(id: string, error: string, _next: Date, dead: boolean) {
    const e = this.events.find((x) => x.id === id)!;
    e.status = dead ? "dead" : "failed";
    e.last_error = error;
  }
  async loadUser(id: string) {
    return this.users.get(id) ?? null;
  }
  async loadGift(id: string, includeMessage: boolean) {
    const g = this.gifts.get(id);
    if (!g) return null;
    const { body, ...row } = g;
    return { ...row, personalized_message: includeMessage ? body : `ref:gifts/${id}` };
  }
  async loadContact(id: string) {
    return this.contacts.get(id) ?? null;
  }
  async loadOrder() {
    return null;
  }
}

const USER: Row = {
  user_id: "u1",
  full_name: "Asha Test",
  email: "asha@example.com",
  phone: "+91 90000 00000",
  signup_timestamp: "2026-10-12T10:00:00Z",
  auth_provider: "email",
  email_verified: false,
  consent_status: "terms:granted; marketing:not_granted",
  consent_timestamp: "2026-10-12T10:00:00Z",
  account_status: "active",
  referral_source: "",
};

test("ensureWorksheets creates all 7 sheets with headers", async () => {
  const api = new FakeSheets();
  const r = await ensureWorksheets(api);
  assert.equal(r.created.length, 7);
  for (const name of Object.keys(WORKSHEETS) as SheetName[]) assert.deepEqual(api.data.get(name)![0], [...WORKSHEETS[name]]);
});

test("ensureWorksheets never overwrites existing data or custom headers", async () => {
  const api = new FakeSheets();
  api.data.set("Users", [["custom", "header"], ["keep", "me"]]);
  const r = await ensureWorksheets(api);
  assert.deepEqual(api.data.get("Users"), [["custom", "header"], ["keep", "me"]]);
  assert.deepEqual(r.headerMismatch, ["Users"]);
});

test("signup → exactly one Users row with the auth user id and timestamp", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  store.users.set("u1", USER);
  store.enqueue("user.upsert", "u1");
  const r = await drain({ store, sheets: api });
  assert.equal(r.synced, 1);
  const rows = api.rows("Users");
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], "u1");
  assert.equal(rows[0][2], "asha@example.com");
  assert.equal(rows[0][4], "2026-10-12T10:00:00Z");
  assert.equal(rows[0][6], "FALSE");
});

test("retries and repeated events update the same row (no duplicates)", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  store.users.set("u1", USER);
  store.enqueue("user.upsert", "u1");
  await drain({ store, sheets: api });
  store.users.set("u1", { ...USER, email_verified: true });
  store.enqueue("user.upsert", "u1"); // e.g. verification webhook
  store.enqueue("user.upsert", "u1"); // duplicate delivery
  await drain({ store, sheets: api });
  const rows = api.rows("Users");
  assert.equal(rows.length, 1);
  assert.equal(rows[0][6], "TRUE");
});

test("Google outage: events marked failed (not lost), retried later without duplicates", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  await ensureWorksheets(api);
  store.users.set("u1", USER);
  store.enqueue("user.upsert", "u1");
  store.enqueue("submission.created", "s1", { user_id: "u1", submission_type: "contact", form_name: "contact_form", submitted_data: { category: "feedback" }, submitted_at: "2026-10-12T11:00:00Z" });
  api.failNext = 1000;
  const r1 = await drain({ store, sheets: api, ensure: false });
  assert.equal(r1.synced, 0);
  assert.equal(r1.failed, 2);
  assert.ok(store.events.every((e) => e.status === "failed" && e.last_error?.includes("503")));
  assert.equal(api.rows("Users").length, 0);

  api.failNext = 0;
  const r2 = await drain({ store, sheets: api, ensure: false });
  assert.equal(r2.synced, 2);
  assert.equal(api.rows("Users").length, 1);
  assert.equal(api.rows("User_Submissions").length, 1);
  assert.deepEqual(JSON.parse(api.rows("User_Submissions")[0][4]), { category: "feedback" });
});

test("partial failure after append is safe: retry updates instead of appending again", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  await ensureWorksheets(api);
  store.users.set("u1", USER);
  store.enqueue("user.upsert", "u1");
  // Simulate: the row was written but marking synced failed (worker crashed).
  await drain({ store, sheets: api, ensure: false });
  store.events[0].status = "pending";
  await drain({ store, sheets: api, ensure: false });
  assert.equal(api.rows("Users").length, 1);
});

test("events that keep failing are parked as 'dead' for the admin to review", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  await ensureWorksheets(api);
  store.users.set("u1", USER);
  store.enqueue("user.upsert", "u1");
  api.failNext = 10_000;
  for (let i = 0; i < MAX_ATTEMPTS; i++) await drain({ store, sheets: api, ensure: false });
  assert.equal(store.events[0].status, "dead");
});

test("not configured: nothing is claimed, events stay pending", async () => {
  const store = new FakeStore();
  store.enqueue("user.upsert", "u1");
  const r = await drain({ store, sheets: null });
  assert.equal(r.configured, false);
  assert.equal(store.events[0].status, "pending");
  assert.equal(store.events[0].attempts, 0);
});

test("gift rows: message text excluded by default; delete marks row and removes names", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  store.gifts.set("g1", { gift_id: "g1", user_id: "u1", occasion: "birthday", recipient_name: "Ravi", relationship: "friend", template_id: "rainy-day-letter", design_configuration_json: "{}", created_timestamp: "t", published_timestamp: "", sharing_status: "draft", body: "private words" });
  store.enqueue("gift.upsert", "g1");
  await drain({ store, sheets: api });
  let row = api.rows("Gift_Creations")[0];
  assert.equal(row[6], "ref:gifts/g1");
  assert.ok(!row.includes("private words"));

  store.gifts.delete("g1");
  store.enqueue("gift.deleted", "g1", { user_id: "u1" });
  await drain({ store, sheets: api });
  row = api.rows("Gift_Creations")[0];
  assert.equal(api.rows("Gift_Creations").length, 1);
  assert.equal(row[10], "deleted");
  assert.equal(row[3], "");
});

test("includeMessages=true copies letter text when the operator opts in", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  store.gifts.set("g2", { gift_id: "g2", user_id: "u1", body: "hello there" });
  store.enqueue("gift.upsert", "g2");
  await drain({ store, sheets: api, includeMessages: true });
  assert.equal(api.rows("Gift_Creations")[0][6], "hello there");
});

test("erasure: user's personal data is blanked across every worksheet", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  store.users.set("u1", USER);
  store.contacts.set("c1", { submission_id: "c1", user_id: "u1", name: "Asha", email: "asha@example.com", category: "feedback", message: "hi", submitted_timestamp: "t", status: "new" });
  store.enqueue("user.upsert", "u1");
  store.enqueue("contact.created", "c1");
  store.enqueue("consent.created", "k1", { user_id: "u1", consent_type: "terms", consent_status: "granted", policy_version: "v1", created_at: "t", source: "signup" });
  await drain({ store, sheets: api });
  store.enqueue("user.erase", "u1");
  await drain({ store, sheets: api });
  const u = api.rows("Users")[0];
  assert.equal(u[1], "");
  assert.equal(u[2], "");
  assert.equal(u[3], "");
  assert.equal(u[9], "deleted");
  const c = api.rows("Feedback_Contact")[0];
  assert.equal(c[2], "");
  assert.equal(c[5], "");
  // Consent audit keeps the legal record (no personal data in it).
  assert.equal(api.rows("Consent_Audit")[0][3], "granted");
});

test("batching: many events → few API calls", async () => {
  const api = new FakeSheets();
  const store = new FakeStore();
  await ensureWorksheets(api);
  for (let i = 0; i < 20; i++) store.enqueue("submission.created", `s${i}`, { user_id: "u1", submission_type: "x", form_name: "f", submitted_data: {} });
  api.calls = [];
  await drain({ store, sheets: api, ensure: false });
  assert.equal(api.rows("User_Submissions").length, 20);
  assert.ok(api.calls.length <= 3, `expected ≤3 calls, got ${api.calls.length}`);
});

test("cells: booleans, nulls and formula-looking text are safe", () => {
  const cells = toCells("Feedback_Contact", { submission_id: "c", name: "=HYPERLINK(\"x\")", email: null, message: "+91 phone ok" });
  assert.equal(cells[2], "'=HYPERLINK(\"x\")");
  assert.equal(cells[3], "");
  assert.equal(cells[5], "+91 phone ok");
});

test("backoff grows exponentially and is capped", () => {
  const now = 0;
  assert.equal(backoff(1, now, 0.5).getTime(), 60_000);
  assert.equal(backoff(3, now, 0.5).getTime(), 240_000);
  assert.equal(backoff(30, now, 0.5).getTime(), 6 * 3600_000);
});
