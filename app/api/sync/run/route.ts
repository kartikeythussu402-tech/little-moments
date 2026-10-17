import { fail, json } from "@/lib/api";
import { runSync } from "@/lib/sheets/store";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

/** Cron entry point (Vercel Cron sends Authorization: Bearer $CRON_SECRET). */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized", 401);
  const db = supabaseAdmin();
  const totals = { claimed: 0, synced: 0, failed: 0, dead: 0, skipped: 0, configured: true, errors: [] as string[] };
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    const r = await runSync(db, 50);
    totals.configured = r.configured;
    totals.claimed += r.claimed;
    totals.synced += r.synced;
    totals.failed += r.failed;
    totals.dead += r.dead;
    totals.skipped += r.skipped;
    totals.errors.push(...r.errors.slice(0, 5));
    if (!r.configured || r.claimed === 0 || r.failed > 0) break;
  }
  return json(totals);
}
export const GET = handle;
export const POST = handle;
