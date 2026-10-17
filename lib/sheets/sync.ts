import { columnLetter, PII_COLUMNS, toCells, WORKSHEETS, type Row, type SheetName } from "./schema";
import { quoteSheet, SheetsHttpError, type SheetsApi } from "./google";

/* ════════════════════════════════════════════════════════════════════
   Transactional-outbox → Google Sheets worker.
   • Every DB change writes an outbox row in the same transaction.
   • drain() claims a batch (per-key FIFO, never two workers on one key),
     turns each event into idempotent sheet operations, flushes them in
     as few API calls as possible, then marks events synced — or failed
     with exponential backoff. Nothing is ever silently dropped.
   • Upserts are keyed on column A, so a retried event updates the same
     row instead of appending a duplicate.
   ════════════════════════════════════════════════════════════════════ */

export interface OutboxEvent {
  id: string;
  event_type: string;
  entity_key: string;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: string;
}

export interface SyncStore {
  claim(limit: number): Promise<OutboxEvent[]>;
  markSynced(ids: string[]): Promise<void>;
  markFailed(id: string, error: string, nextAttemptAt: Date, dead: boolean): Promise<void>;
  loadUser(id: string): Promise<Row | null>;
  loadGift(id: string, includeMessage: boolean): Promise<Row | null>;
  loadContact(id: string): Promise<Row | null>;
  loadOrder(id: string): Promise<Row | null>;
}

export type Action =
  | { kind: "upsert"; sheet: SheetName; key: string; row: Row }
  | { kind: "patch"; sheet: SheetName; key: string; patch: Row }
  | { kind: "erase"; userId: string }
  | { kind: "skip"; reason: string };

export const MAX_ATTEMPTS = 8;

/** 1 min, 2, 4, 8 … capped at 6 h, with ±20% jitter. */
export function backoff(attempts: number, now = Date.now(), rand = Math.random()): Date {
  const base = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 6 * 3600_000);
  return new Date(now + base * (0.8 + rand * 0.4));
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export async function buildActions(e: OutboxEvent, store: SyncStore, opts: { includeMessages: boolean }): Promise<Action[]> {
  const p = e.payload ?? {};
  switch (e.event_type) {
    case "user.upsert": {
      const row = await store.loadUser(e.entity_key);
      return row ? [{ kind: "upsert", sheet: "Users", key: e.entity_key, row }] : [{ kind: "skip", reason: "user no longer exists" }];
    }
    case "user.erase":
      return [{ kind: "erase", userId: e.entity_key }];
    case "gift.upsert": {
      const row = await store.loadGift(e.entity_key, opts.includeMessages);
      return row ? [{ kind: "upsert", sheet: "Gift_Creations", key: e.entity_key, row }] : [{ kind: "skip", reason: "gift no longer exists" }];
    }
    case "gift.deleted":
      return [{ kind: "patch", sheet: "Gift_Creations", key: e.entity_key, patch: { sharing_status: "deleted", recipient_name: "", personalized_message: "" } }];
    case "media.created":
      return [{ kind: "upsert", sheet: "Media_Metadata", key: e.entity_key, row: p as Row }];
    case "contact.created": {
      const row = await store.loadContact(e.entity_key);
      return row ? [{ kind: "upsert", sheet: "Feedback_Contact", key: e.entity_key, row }] : [{ kind: "skip", reason: "contact submission removed" }];
    }
    case "submission.created":
      return [
        {
          kind: "upsert",
          sheet: "User_Submissions",
          key: e.entity_key,
          row: {
            submission_id: e.entity_key,
            user_id: s(p.user_id),
            submission_type: s(p.submission_type),
            form_name: s(p.form_name),
            submitted_data_json: JSON.stringify(p.submitted_data ?? {}),
            submission_timestamp: s(p.submitted_at || e.created_at),
            consent_reference: s(p.consent_reference),
            processing_status: "received",
          },
        },
      ];
    case "consent.created":
      return [
        {
          kind: "upsert",
          sheet: "Consent_Audit",
          key: e.entity_key,
          row: {
            consent_event_id: e.entity_key,
            user_id: s(p.user_id),
            consent_type: s(p.consent_type),
            consent_status: s(p.consent_status),
            policy_version: s(p.policy_version),
            timestamp: s(p.created_at),
            source: s(p.source),
          },
        },
      ];
    case "order.upsert": {
      const row = await store.loadOrder(e.entity_key);
      return row ? [{ kind: "upsert", sheet: "Orders_Payments", key: e.entity_key, row }] : [{ kind: "skip", reason: "order removed" }];
    }
    default:
      return [{ kind: "skip", reason: `unknown event type ${e.event_type}` }];
  }
}

/** Creates any missing worksheets and writes headers into EMPTY ones. Never overwrites data. */
export async function ensureWorksheets(api: SheetsApi): Promise<{ created: string[]; headerMismatch: string[] }> {
  const existing = await api.listSheets();
  const missing = (Object.keys(WORKSHEETS) as SheetName[]).filter((n) => !existing.includes(n));
  await api.addSheets(missing);
  const headerMismatch: string[] = [];
  const writes: Array<{ range: string; values: string[][] }> = [];
  for (const name of Object.keys(WORKSHEETS) as SheetName[]) {
    const cols = WORKSHEETS[name];
    const first = missing.includes(name) ? [] : await api.getRange(`${quoteSheet(name)}!A1:${columnLetter(cols.length)}1`);
    if (!first.length || first[0].every((c) => !c)) {
      writes.push({ range: `${quoteSheet(name)}!A1:${columnLetter(cols.length)}1`, values: [[...cols]] });
    } else if (cols.some((c, i) => first[0][i] !== c)) {
      headerMismatch.push(name);
    }
  }
  await api.updateRanges(writes);
  return { created: missing, headerMismatch };
}

interface SheetCache {
  /** key → 1-based row number */
  index: Map<string, number>;
  lastRow: number;
  values?: string[][];
}

export interface DrainResult {
  configured: boolean;
  claimed: number;
  synced: number;
  failed: number;
  dead: number;
  skipped: number;
  errors: string[];
}

export async function drain(opts: {
  store: SyncStore;
  sheets: SheetsApi | null;
  limit?: number;
  includeMessages?: boolean;
  ensure?: boolean;
}): Promise<DrainResult> {
  const result: DrainResult = { configured: Boolean(opts.sheets), claimed: 0, synced: 0, failed: 0, dead: 0, skipped: 0, errors: [] };
  // Not configured: leave events pending (attempts untouched) so nothing is lost.
  if (!opts.sheets) return result;
  const api = opts.sheets;

  const events = await opts.store.claim(opts.limit ?? 25);
  result.claimed = events.length;
  if (!events.length) return result;

  const fail = async (e: OutboxEvent, msg: string) => {
    const dead = e.attempts >= MAX_ATTEMPTS;
    await opts.store.markFailed(e.id, msg.slice(0, 500), backoff(e.attempts), dead);
    if (dead) result.dead++;
    else result.failed++;
    result.errors.push(`${e.event_type}(${e.entity_key}): ${msg}`);
  };

  // 1. Turn events into actions (DB reads only).
  const planned: Array<{ e: OutboxEvent; actions: Action[] }> = [];
  for (const e of events) {
    try {
      planned.push({ e, actions: await buildActions(e, opts.store, { includeMessages: Boolean(opts.includeMessages) }) });
    } catch (err) {
      await fail(e, `build: ${(err as Error).message}`);
    }
  }

  try {
    if (opts.ensure !== false) await ensureWorksheets(api);

    // 2. Load key indexes for the sheets we touch (one read each).
    const cache = new Map<SheetName, SheetCache>();
    const sheetFor = async (name: SheetName, full = false): Promise<SheetCache> => {
      let c = cache.get(name);
      if (!c || (full && !c.values)) {
        const width = columnLetter(WORKSHEETS[name].length);
        const values = await api.getRange(full ? `${quoteSheet(name)}!A:${width}` : `${quoteSheet(name)}!A:A`);
        const index = new Map<string, number>();
        values.forEach((r, i) => {
          if (i > 0 && r[0]) index.set(r[0], i + 1);
        });
        c = { index, lastRow: Math.max(1, values.length), values: full ? values : undefined };
        cache.set(name, c);
      }
      return c;
    };

    const updates = new Map<string, { range: string; values: string[][] }>();
    const appends = new Map<SheetName, Map<string, string[]>>();
    const rowRange = (sheet: SheetName, row: number) => `${quoteSheet(sheet)}!A${row}:${columnLetter(WORKSHEETS[sheet].length)}${row}`;

    // 3. Apply actions in order, coalescing repeated writes to the same key.
    for (const { actions } of planned) {
      for (const a of actions) {
        if (a.kind === "skip") {
          result.skipped++;
          continue;
        }
        if (a.kind === "upsert") {
          const c = await sheetFor(a.sheet);
          const cells = toCells(a.sheet, { ...a.row, [WORKSHEETS[a.sheet][0]]: a.key });
          const at = c.index.get(a.key);
          if (at) updates.set(rowRange(a.sheet, at), { range: rowRange(a.sheet, at), values: [cells] });
          else {
            if (!appends.has(a.sheet)) appends.set(a.sheet, new Map());
            appends.get(a.sheet)!.set(a.key, cells);
          }
        } else if (a.kind === "patch") {
          const cols = WORKSHEETS[a.sheet] as readonly string[];
          const pending = appends.get(a.sheet)?.get(a.key);
          const apply = (cells: string[]) => cols.map((col, i) => (col in a.patch ? toCells(a.sheet, a.patch)[i] : (cells[i] ?? "")));
          if (pending) appends.get(a.sheet)!.set(a.key, apply(pending));
          else {
            const c = await sheetFor(a.sheet, true);
            const at = c.index.get(a.key);
            if (at) {
              const existing = updates.get(rowRange(a.sheet, at))?.values[0] ?? c.values![at - 1] ?? [];
              updates.set(rowRange(a.sheet, at), { range: rowRange(a.sheet, at), values: [apply(existing)] });
            }
          }
        } else if (a.kind === "erase") {
          for (const name of Object.keys(WORKSHEETS) as SheetName[]) {
            const cols = WORKSHEETS[name] as readonly string[];
            const uidCol = cols.indexOf("user_id");
            if (uidCol < 0) continue;
            const scrub = (cells: string[]) => cols.map((col, i) => (PII_COLUMNS.has(col) ? "" : col === "account_status" ? "deleted" : (cells[i] ?? "")));
            const c = await sheetFor(name, true);
            c.values!.forEach((r, i) => {
              if (i > 0 && r[uidCol] === a.userId) updates.set(rowRange(name, i + 1), { range: rowRange(name, i + 1), values: [scrub(updates.get(rowRange(name, i + 1))?.values[0] ?? r)] });
            });
            appends.get(name)?.forEach((cells, key, m) => {
              if (cells[uidCol] === a.userId) m.set(key, scrub(cells));
            });
          }
        }
      }
    }

    // 4. Flush: one batch update + one append per sheet.
    await api.updateRanges([...updates.values()]);
    for (const [sheet, rows] of appends) await api.append(sheet, [...rows.values()]);

    const ids = planned.map((p) => p.e.id);
    await opts.store.markSynced(ids);
    result.synced += ids.length;
  } catch (err) {
    const msg = err instanceof SheetsHttpError ? err.message : `unexpected: ${(err as Error).message}`;
    for (const { e } of planned) await fail(e, msg);
  }
  return result;
}
