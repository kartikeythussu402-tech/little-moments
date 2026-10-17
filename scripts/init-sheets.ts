/**
 * One-time (and safe to repeat) Google Sheets setup.
 *   npm run sheets:init            → creates the 7 worksheets + headers (never overwrites data)
 *   npm run sheets:init -- --verify → also writes & reads back a test row in a "_Healthcheck" sheet
 * Reads credentials from .env.local.
 */
import { existsSync } from "node:fs";
import { GoogleSheets, quoteSheet, sheetsConfigured } from "../lib/sheets/google";
import { ensureWorksheets } from "../lib/sheets/sync";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  if (!sheetsConfigured()) {
    console.error("✗ GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY are missing in .env.local");
    process.exit(1);
  }
  const api = new GoogleSheets();
  const r = await ensureWorksheets(api);
  console.log(`✓ Worksheets ready. Created: ${r.created.join(", ") || "none (all existed)"}`);
  if (r.headerMismatch.length) console.warn(`! Header row differs (left untouched) in: ${r.headerMismatch.join(", ")}`);

  if (process.argv.includes("--verify")) {
    const sheet = "_Healthcheck";
    if (!(await api.listSheets()).includes(sheet)) await api.addSheets([sheet]);
    const stamp = new Date().toISOString();
    await api.updateRanges([{ range: `${quoteSheet(sheet)}!A1:B1`, values: [["last_verified_at", stamp]] }]);
    const back = await api.getRange(`${quoteSheet(sheet)}!A1:B1`);
    if (back[0]?.[1] === stamp) console.log(`✓ Verified: wrote and read back a test value (${stamp}).`);
    else throw new Error("Wrote a test value but could not read it back.");
  }
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  if (String(e.message).includes("403")) console.error("  → Share the spreadsheet with your service-account email as an Editor.");
  if (String(e.message).includes("404")) console.error("  → Check GOOGLE_SHEET_ID (the long id in the sheet's URL).");
  process.exit(1);
});
