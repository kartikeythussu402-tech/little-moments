/** Manually drain the Google Sheets outbox once (useful locally): npm run sync:run */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { runSync } from "../lib/sheets/store";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let total = 0;
  for (let i = 0; i < 20; i++) {
    const r = await runSync(db, 50);
    if (!r.configured) {
      console.log("Google Sheets is not configured — events stay queued.");
      return;
    }
    total += r.synced;
    if (r.errors.length) console.warn(r.errors.join("\n"));
    if (r.claimed === 0) break;
  }
  console.log(`✓ Synced ${total} event(s).`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
