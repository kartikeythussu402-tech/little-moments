/**
 * Executes the real Supabase migrations on an embedded Postgres (PGlite) with
 * Supabase auth/storage stubbed, then checks RLS, triggers, outbox and RPCs.
 *   npm run test:db
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

async function main() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(read("tests/db/supabase-stub.sql"));
  const migration = read("supabase/migrations/0001_init.sql");
  const seed = read("supabase/migrations/0002_seed_catalog.sql");
  await db.exec(migration);
  await db.exec(seed);
  // Idempotency: running everything twice must not fail.
  await db.exec(migration);
  await db.exec(seed);
  await db.exec("grant all on all tables in schema public to service_role; grant select on public.occasions, public.templates to anon, authenticated;");
  console.log("Migration applied twice without errors.\n");

  const as = async <T = Record<string, unknown>>(role: "anon" | "authenticated" | "service_role", uid: string | null, sql: string, params: unknown[] = []) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
    await db.exec(`set role ${role};`);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec("reset role;");
    }
  };
  const su = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";

  await check("catalog seeded (22 occasions, 15 templates)", async () => {
    const [o] = await su<{ n: number }>("select count(*)::int n from occasions");
    const [t] = await su<{ n: number }>("select count(*)::int n from templates");
    assert.equal(o.n, 22);
    assert.equal(t.n, 15);
  });

  await check("signup creates profile, consent audit and Users outbox event", async () => {
    await su(
      `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'a@example.com', '{"full_name":"Asha Test","phone":"+91 90000 00000","terms_accepted":true,"marketing_consent":false,"policy_version":"v1"}'),
       ($2, 'b@example.com', '{"full_name":"Bo Test","terms_accepted":true,"marketing_consent":true}')`,
      [A, B],
    );
    const [p] = await su<{ full_name: string; phone: string; marketing_consent: boolean; terms_accepted_at: string | null }>(
      "select * from profiles where id = $1",
      [A],
    );
    assert.equal(p.full_name, "Asha Test");
    assert.equal(p.phone, "+91 90000 00000");
    assert.equal(p.marketing_consent, false);
    assert.ok(p.terms_accepted_at);
    const consents = await su<{ consent_type: string; consent_status: string }>("select consent_type, consent_status from consent_events where user_id = $1 order by consent_type", [A]);
    assert.deepEqual(consents, [
      { consent_type: "marketing", consent_status: "withdrawn" },
      { consent_type: "terms", consent_status: "granted" },
    ]);
    const ev = await su<{ event_type: string }>("select event_type from sync_events where entity_key = $1", [A]);
    assert.ok(ev.some((e) => e.event_type === "user.upsert"));
    const c = await su<{ n: number }>("select count(*)::int n from sync_events where event_type = 'consent.created'");
    assert.equal(c[0].n, 4);
  });

  await check("email verification re-syncs the Users row", async () => {
    const before = await su<{ n: number }>("select count(*)::int n from sync_events where event_type='user.upsert' and entity_key=$1", [A]);
    await su("update auth.users set email_confirmed_at = now() where id = $1", [A]);
    const after = await su<{ n: number }>("select count(*)::int n from sync_events where event_type='user.upsert' and entity_key=$1", [A]);
    assert.equal(after[0].n, before[0].n + 1);
  });

  let giftId = "";
  let slug = "";
  await check("owner can create a draft gift; slug is a long random string", async () => {
    const rows = await as<{ id: string; slug: string; status: string }>(
      "authenticated",
      A,
      `insert into gifts (owner_id, format, template_slug, occasion_slug, recipient_name, config)
       values ($1, 'letter', 'rainy-day-letter', 'anniversary', 'Ravi', '{"format":"letter","letter":{"body":"hi"}}') returning id, slug, status`,
      [A],
    );
    giftId = rows[0].id;
    slug = rows[0].slug;
    assert.equal(rows[0].status, "draft");
    assert.equal(slug.length, 22);
    assert.match(slug, /^[A-Za-z0-9Kq]+$/);
  });

  await check("cannot create a gift for someone else", async () => {
    await assert.rejects(as("authenticated", B, `insert into gifts (owner_id, format, config) values ($1, 'letter', '{"format":"letter"}')`, [A]));
  });

  await check("config.format must match format column", async () => {
    await assert.rejects(as("authenticated", A, `insert into gifts (owner_id, format, config) values ($1, 'letter', '{"format":"bouquet"}')`, [A]));
  });

  await check("other users cannot see, edit or delete the gift", async () => {
    const seen = await as("authenticated", B, "select * from gifts where id = $1", [giftId]);
    assert.equal(seen.length, 0);
    await as("authenticated", B, "update gifts set recipient_name = 'hacked' where id = $1", [giftId]);
    await as("authenticated", B, "delete from gifts where id = $1", [giftId]);
    const [g] = await su<{ recipient_name: string }>("select recipient_name from gifts where id = $1", [giftId]);
    assert.equal(g.recipient_name, "Ravi");
  });

  await check("anonymous visitors cannot read gifts table directly", async () => {
    const rows = await as("anon", null, "select * from gifts");
    assert.equal(rows.length, 0);
  });

  await check("draft is NOT available through the public lookup", async () => {
    const [r] = await as<{ g: unknown }>("anon", null, "select get_published_gift($1) g", [slug]);
    assert.equal(r.g, null);
  });

  await check("publishing exposes it publicly and stamps published_at", async () => {
    await as("authenticated", A, "update gifts set status = 'published' where id = $1", [giftId]);
    const [r] = await as<{ g: { config: { format: string }; published_at: string } }>("anon", null, "select get_published_gift($1) g", [slug]);
    assert.equal(r.g.config.format, "letter");
    assert.ok(r.g.published_at);
  });

  await check("disabling the link revokes public access", async () => {
    await as("authenticated", A, "update gifts set sharing_enabled = false where id = $1", [giftId]);
    const [r] = await as<{ g: unknown }>("anon", null, "select get_published_gift($1) g", [slug]);
    assert.equal(r.g, null);
    await as("authenticated", A, "update gifts set sharing_enabled = true where id = $1", [giftId]);
  });

  await check("owner cannot change slug or owner (column privileges)", async () => {
    await assert.rejects(as("authenticated", A, "update gifts set slug = 'guessable' where id = $1", [giftId]));
    await assert.rejects(as("authenticated", A, "update gifts set owner_id = $2 where id = $1", [giftId, B]));
  });

  await check("users cannot make themselves admin", async () => {
    await assert.rejects(as("authenticated", A, "update profiles set is_admin = true where id = $1", [A]));
  });

  await check("marketing consent change is audited and reported", async () => {
    await as("authenticated", A, "update profiles set marketing_consent = true where id = $1", [A]);
    const c = await su<{ consent_status: string }>(
      "select consent_status from consent_events where user_id=$1 and consent_type='marketing' order by created_at desc, consent_status asc limit 1",
      [A],
    );
    assert.equal(c[0].consent_status, "granted");
    const s = await su<{ payload: { submitted_data: Record<string, unknown> } }>(
      "select payload from sync_events where event_type='submission.created' and payload->>'submission_type'='profile_update'",
    );
    assert.equal(s.length, 1);
    assert.deepEqual(s[0].payload.submitted_data, { marketing_consent: true });
  });

  await check("autosaves are coalesced into one pending gift.upsert", async () => {
    await su("update sync_events set status='synced' where event_type='gift.upsert'");
    for (let i = 0; i < 5; i++) {
      await as("authenticated", A, "update gifts set config = config || jsonb_build_object('n', $2::int) where id = $1", [giftId, i]);
    }
    const [r] = await su<{ n: number }>("select count(*)::int n from sync_events where event_type='gift.upsert' and status='pending' and entity_key=$1", [giftId]);
    assert.equal(r.n, 1);
  });

  await check("media: max 3 per gift, must belong to uploader's gift", async () => {
    for (let i = 0; i < 3; i++) {
      await su(
        "insert into gift_media (gift_id, owner_id, storage_path, file_name, file_type, file_size) values ($1,$2,$3,'p.jpg','image/jpeg',1000)",
        [giftId, A, `${A}/${giftId}/${i}.jpg`],
      );
    }
    await assert.rejects(
      su("insert into gift_media (gift_id, owner_id, storage_path, file_name, file_type, file_size) values ($1,$2,'x/4.jpg','p.jpg','image/jpeg',1000)", [giftId, A]),
      /limit_reached/,
    );
    await assert.rejects(
      su("insert into gift_media (gift_id, owner_id, storage_path, file_name, file_type, file_size) values ($1,$2,'x/5.jpg','p.jpg','image/jpeg',1000)", [giftId, B]),
      /forbidden/,
    );
    await assert.rejects(
      su("insert into gift_media (gift_id, owner_id, storage_path, file_name, file_type, file_size) values ($1,$2,'x/6.gif','p.gif','image/gif',1000)", [giftId, A]),
    );
    const [r] = await as<{ g: { media: unknown[] } }>("anon", null, "select get_published_gift($1) g", [slug]);
    assert.equal(r.g.media.length, 3);
    const ev = await su<{ n: number }>("select count(*)::int n from sync_events where event_type='media.created'");
    assert.equal(ev[0].n, 3);
  });

  await check("normal users cannot read the outbox, contacts, or call worker/admin RPCs", async () => {
    await assert.rejects(as("authenticated", A, "select * from sync_events"));
    await assert.rejects(as("anon", null, "select * from contact_submissions"));
    await assert.rejects(as("authenticated", A, "select * from claim_sync_events(10)"));
    await assert.rejects(as("anon", null, "select admin_metrics()"));
    await assert.rejects(as("anon", null, "select enqueue_sync('x','y','{}')"));
  });

  await check("contact submission enqueues Feedback_Contact + User_Submissions events", async () => {
    await su("insert into contact_submissions (name, email, category, message) values ('Test', 't@example.com', 'feedback', 'Lovely product')");
    const ev = await su<{ event_type: string }>("select event_type from sync_events where event_type in ('contact.created') or (event_type='submission.created' and payload->>'submission_type'='contact')");
    assert.equal(ev.length, 2);
    await assert.rejects(su("insert into contact_submissions (name, email, category, message) values ('T', 'not-an-email', 'feedback', 'hello there')"));
  });

  await check("worker claims are exclusive (no double processing)", async () => {
    const first = await su<{ id: string }>("select id from claim_sync_events(5)");
    const second = await su<{ id: string }>("select id from claim_sync_events(5)");
    assert.equal(first.length, 5);
    const overlap = first.filter((f) => second.some((s) => s.id === f.id));
    assert.equal(overlap.length, 0);
    const [p] = await su<{ n: number }>("select count(*)::int n from sync_events where status='processing'");
    assert.equal(p.n, first.length + second.length);
  });

  await check("per-key FIFO: only one in-flight event per row key", async () => {
    await su("update sync_events set status='synced'");
    await db.exec(`select enqueue_sync('user.upsert','KEY-1','{"n":1}'); select pg_sleep(0.01); select enqueue_sync('user.upsert','KEY-1','{"n":2}'); select enqueue_sync('user.upsert','KEY-2','{}');`);
    const a = await su<{ entity_key: string; payload: { n?: number } }>("select entity_key, payload from claim_sync_events(10)");
    assert.equal(a.filter((r) => r.entity_key === "KEY-1").length, 1);
    assert.equal(a.find((r) => r.entity_key === "KEY-1")!.payload.n, 1);
    const b = await su<{ entity_key: string }>("select entity_key from claim_sync_events(10)");
    assert.equal(b.filter((r) => r.entity_key === "KEY-1").length, 0, "second event must wait for the first");
    await su("update sync_events set status='synced' where entity_key='KEY-1' and payload->>'n'='1'");
    const c = await su<{ entity_key: string; payload: { n?: number } }>("select entity_key, payload from claim_sync_events(10)");
    assert.equal(c.find((r) => r.entity_key === "KEY-1")?.payload.n, 2);
  });

  await check("stale processing locks are reclaimed after 5 minutes", async () => {
    await su("update sync_events set status='processing', locked_at = now() - interval '10 minutes' where id = (select id from sync_events limit 1)");
    const rows = await su<{ attempts: number }>("select attempts from claim_sync_events(100)");
    assert.ok(rows.length > 0);
  });

  await check("rate limit: 30 gifts per 10 minutes", async () => {
    await assert.rejects(
      (async () => {
        for (let i = 0; i < 31; i++) {
          await as("authenticated", B, `insert into gifts (owner_id, format, config) values ($1, 'bouquet', '{"format":"bouquet"}')`, [B]);
        }
      })(),
      /rate_limited/,
    );
  });

  await check("deleting a gift cascades media and enqueues gift.deleted", async () => {
    await as("authenticated", A, "delete from gifts where id = $1", [giftId]);
    const m = await su<{ n: number }>("select count(*)::int n from gift_media where gift_id=$1", [giftId]);
    assert.equal(m[0].n, 0);
    const ev = await su<{ n: number }>("select count(*)::int n from sync_events where event_type='gift.deleted' and entity_key=$1", [giftId]);
    assert.equal(ev[0].n, 1);
  });

  await check("deleting the auth user removes profile + gifts but keeps consent audit", async () => {
    await su("delete from auth.users where id = $1", [B]);
    const [p] = await su<{ n: number }>("select count(*)::int n from profiles where id=$1", [B]);
    const [g] = await su<{ n: number }>("select count(*)::int n from gifts where owner_id=$1", [B]);
    const [c] = await su<{ n: number }>("select count(*)::int n from consent_events where user_id=$1", [B]);
    assert.equal(p.n, 0);
    assert.equal(g.n, 0);
    assert.ok(c.n >= 2);
  });

  await check("admin_metrics works for the service role", async () => {
    const [r] = await su<{ m: { users: number; sync: Record<string, number> } }>("select admin_metrics() m");
    assert.equal(r.m.users, 1);
    assert.ok(Object.keys(r.m.sync).length > 0);
  });

  console.log(`\n${passed} database checks passed${process.exitCode ? " — SOME FAILED" : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
