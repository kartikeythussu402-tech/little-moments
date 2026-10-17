/**
 * End-to-end journey in DEMO mode (no backend): run against `next start`.
 *   PLAYWRIGHT_BROWSERS_PATH=... node tests/e2e/demo-journey.mjs http://localhost:3000
 * Needs `playwright` and `sharp` resolvable from MODULES_DIR (default ./node_modules).
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.env.SHOTS || "screenshots";
mkdirSync(OUT, { recursive: true });

let passed = 0;
const failures = [];
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures.push(name);
    console.error(`  ✗ ${name}\n    ${e.message.split("\n")[0]}`);
  }
}

// Resolve playwright/sharp from MODULES_DIR (defaults to this project's node_modules).
const require = createRequire(`${process.env.MODULES_DIR || process.cwd() + "/node_modules"}/`);
const { chromium } = require("playwright");
const sharp = require("sharp");
const PNG = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#c9566f" } }).png().toBuffer();

const browser = await chromium.launch();

async function newPage(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Count real failures only: 404s for pages we deliberately visit as "not found" are expected.
  page.on("response", (r) => r.status() >= 400 && r.request().resourceType() !== "document" && !r.url().includes("/api/") && errors.push(`${r.status()} ${r.url()}`));
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()));
  return { ctx, page, errors };
}

async function noOverflow(page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw + 1, `horizontal overflow: ${sw} > ${iw}`);
}

console.log("Mobile (390×844):");
const m = await newPage({ width: 390, height: 844 }, true);
const page = m.page;
let slug = "";

await step("homepage loads, value prop + CTA visible, no horizontal scroll", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert.match(await page.getByRole("heading", { level: 1 }).innerText(), /Write it\. Wrap it\./);
  assert.ok(await page.getByRole("link", { name: /Create your gift/ }).first().isVisible());
  await noOverflow(page);
  await page.screenshot({ path: `${OUT}/m-01-home.png` });
  await page.screenshot({ path: `${OUT}/m-01-home-full.png`, fullPage: true });
});

await step("demo-mode banner is shown", async () => {
  assert.ok(await page.getByText(/Demo mode/).first().isVisible());
});

await step("footer has exact mailto and tel links", async () => {
  const mail = page.locator('footer a[href="mailto:littlemomentsforyourlovedonce@gmail.com"]');
  assert.equal(await mail.count(), 1);
  assert.equal(await page.locator('footer a[href="tel:+919569884116"]').count(), 1);
  assert.equal(await page.locator('footer a[href="tel:+917896927604"]').count(), 1);
});

await step("mobile menu opens and navigates", async () => {
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-nav").getByRole("link", { name: "Templates" }).click();
  await page.waitForURL(/\/templates$/);
  await page.getByRole("heading", { name: "Find a starting point" }).waitFor();
});

await step("template filters narrow results and can be cleared", async () => {
  await page.getByLabel("Gift type").selectOption("bouquet");
  const count = await page.locator("main ul, main div.grid").locator("a[href^='/templates/']").count();
  assert.ok(count >= 1 && count <= 4, `bouquet templates: ${count}`);
  await page.getByPlaceholder("Search templates").fill("zzzz");
  await page.getByText("No templates match those filters.").waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.screenshot({ path: `${OUT}/m-02-templates.png` });
});

await step("occasion search + occasion page", async () => {
  await page.goto(`${BASE}/occasions`);
  await page.getByLabel("Search occasions").fill("rakhi");
  await page.getByRole("link", { name: /Raksha Bandhan/ }).first().click();
  await page.waitForURL(/occasions\/raksha-bandhan/);
  await page.getByRole("heading", { level: 1, name: "Raksha Bandhan" }).waitFor();
});

await step("create flow: choose format → start blank → editor opens", async () => {
  await page.goto(`${BASE}/create`);
  await page.getByRole("link", { name: /Letter \+ bouquet \+ photos/ }).click();
  await page.waitForURL(/format=combo/);
  await page.getByRole("link", { name: /Start blank/ }).click();
  await page.waitForURL(/\/editor\/new/);
  await page.getByLabel(/Their name/).waitFor();
});

await step("publish is blocked with a clear message when the name is missing", async () => {
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByText("Add their name (Details tab).").waitFor();
});

await step("editor: details, tone + letter text update the live preview", async () => {
  await page.getByLabel(/Their name/).fill("Meera");
  await page.getByLabel("Your name").fill("Kabir");
  await page.getByRole("tab", { name: "Message" }).click();
  await page.getByRole("button", { name: "Romantic" }).click();
  await page.getByLabel("Your letter").fill("Ten years of chai, rain and terrible jokes.\n\nI'd choose you again, every single time.");
  await page.getByRole("tab", { name: "Preview" }).click();
  await page.getByText("Dear Meera,").waitFor();
  await page.getByText(/I'd choose you again/).waitFor();
  await page.screenshot({ path: `${OUT}/m-03-editor-preview.png` });
});

await step("bouquet builder: +/− stems and wrap change", async () => {
  await page.getByRole("tab", { name: "Bouquet" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Add one tulips" }).click();
  await page.getByRole("button", { name: "Remove one roses" }).click();
  assert.equal(await page.getByLabel("Tulips count").innerText(), "3");
  assert.equal(await page.getByLabel("Roses count").innerText(), "2");
  await page.getByRole("button", { name: "Silk" }).click();
  await page.screenshot({ path: `${OUT}/m-04-bouquet-builder.png` });
  // the 12-stem cap
  for (let i = 0; i < 10; i++) {
    const add = page.getByRole("button", { name: "Add one sunflowers" });
    if (await add.isDisabled()) break;
    await add.click();
  }
  await page.getByText(/That's a full bouquet/).waitFor();
});

await step("photos: save first, then upload PNG; reject a non-image", async () => {
  await page.getByRole("tab", { name: "Photos" }).click();
  await page.getByRole("button", { name: "Save & add photos" }).click();
  await page.waitForURL(/\/editor\/[0-9a-f-]{36}$/);
  await page.locator("#photo-input").setInputFiles({ name: "us.png", mimeType: "image/png", buffer: PNG });
  await page.getByAltText("Photo 1").first().waitFor();
  await page.locator("#photo-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await page.getByText(/isn't a JPG, PNG or WebP/).waitFor();
  await page.getByLabel("Caption for photo 1").fill("Goa, 2019");
});

await step("design: palette + paper + stickers", async () => {
  await page.getByRole("tab", { name: "Design" }).click();
  await page.getByRole("button", { name: "Night" }).first().click();
  await page.getByRole("button", { name: "Blush" }).first().click();
  await page.getByRole("button", { name: /Floral/ }).first().click();
  await page.getByRole("button", { name: /Heart/ }).first().click();
});

await step("autosave shows saved state", async () => {
  await page.getByText(/Saved in this browser/).waitFor({ timeout: 8000 });
});

await step("publish → share sheet with link, WhatsApp, copy, link toggle", async () => {
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("heading", { name: "It's ready to send" }).waitFor();
  const url = await page.locator("#share-url").inputValue();
  slug = url.split("/gift/")[1];
  assert.ok(slug && slug.length >= 20, `slug ${slug}`);
  const wa = await page.getByRole("link", { name: /Send on WhatsApp/ }).getAttribute("href");
  assert.ok(wa.startsWith("https://wa.me/?text=") && decodeURIComponent(wa).includes(slug));
  assert.ok(await page.getByRole("dialog").getByRole("switch").isVisible());
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/m-05-share.png` });
  await page.getByRole("button", { name: "Close" }).click();
});

await step("recipient: envelope → tap seal → letter, bouquet, photo", async () => {
  const r = await m.ctx.newPage();
  await r.goto(`${BASE}/gift/${slug}`, { waitUntil: "networkidle" });
  await r.getByRole("button", { name: "Open your letter" }).waitFor();
  await noOverflow(r);
  await r.screenshot({ path: `${OUT}/m-06-recipient-envelope.png` });
  await r.getByRole("button", { name: "Open your letter" }).click();
  await r.getByText("Dear Meera,").waitFor({ timeout: 5000 });
  await r.getByRole("img", { name: /bouquet of/i }).waitFor();
  await r.getByText("Goa, 2019").waitFor();
  await r.waitForTimeout(1500);
  await noOverflow(r);
  await r.screenshot({ path: `${OUT}/m-07-recipient-open.png` });
  await r.screenshot({ path: `${OUT}/m-07-recipient-open-full.png`, fullPage: true });
  await r.close();
});

await step("dashboard: gift listed as Published; turning the link off blocks the recipient", async () => {
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("For Meera").waitFor();
  await page.getByText("Published").first().waitFor();
  await page.screenshot({ path: `${OUT}/m-08-dashboard.png` });
  await page.getByRole("button", { name: "Share" }).first().click();
  await page.getByRole("dialog").getByRole("switch").click();
  await page.getByText("Link is off").waitFor();
  await page.getByRole("button", { name: "Close" }).click();
  const r = await m.ctx.newPage();
  await r.goto(`${BASE}/gift/${slug}`);
  await r.getByRole("heading", { name: /This moment isn't available/ }).waitFor();
  await r.close();
});

await step("dashboard: duplicate then delete with confirmation", async () => {
  await page.getByRole("button", { name: "Duplicate" }).first().click();
  await page.getByText("Duplicated as a new draft.").waitFor();
  assert.equal(await page.getByText("Draft", { exact: true }).count(), 1);
  await page.getByRole("button", { name: "Delete gift" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await page.getByText("Gift deleted.").waitFor();
});

await step("unknown gift slug shows the gentle unavailable page", async () => {
  await page.goto(`${BASE}/gift/doesNotExist123456789`);
  await page.getByRole("heading", { name: /This moment isn't available/ }).waitFor();
});

await step("template → 'Use this template' opens editor pre-filled", async () => {
  await page.goto(`${BASE}/templates/marigold-morning`);
  await page.getByRole("link", { name: /Use this template/ }).click();
  await page.waitForURL(/template=marigold-morning/);
  await page.getByRole("tab", { name: "Message" }).click();
  assert.match(await page.getByLabel("Headline").inputValue(), /Happy Diwali/);
});

await step("contact page: details + demo notice; legal pages render", async () => {
  await page.goto(`${BASE}/contact`);
  assert.equal(await page.locator('main a[href="mailto:littlemomentsforyourlovedonce@gmail.com"]').count() >= 1, true);
  assert.equal(await page.locator('main a[href="tel:+919569884116"]').count(), 1);
  await page.screenshot({ path: `${OUT}/m-09-contact.png` });
  for (const p of ["/privacy", "/terms", "/pricing", "/example", "/login", "/signup", "/account", "/forgot-password"]) {
    const res = await page.goto(`${BASE}${p}`);
    assert.equal(res.status(), 200, `${p} → ${res.status()}`);
    await noOverflow(page);
  }
});

await step("example gift plays its opening", async () => {
  await page.goto(`${BASE}/example`);
  await page.getByRole("button", { name: "Open your letter" }).click();
  await page.getByText("Dear Ananya,").waitFor();
  await page.getByRole("button", { name: /Reveal reason 2/ }).click();
  await page.getByText("You remember how I take my chai.").waitFor();
});

await step("admin route is not exposed without a backend/admin role", async () => {
  const res = await page.goto(`${BASE}/admin`);
  assert.equal(res.status(), 404);
});

await step("API refuses writes in demo mode (no fake persistence)", async () => {
  const res = await page.request.post(`${BASE}/api/gifts`, { data: { config: {} } });
  assert.equal(res.status(), 503);
  const c = await page.request.post(`${BASE}/api/contact`, { data: { name: "x", email: "x@y.z", category: "other", message: "hello" } });
  assert.equal(c.status(), 503);
  const cron = await page.request.get(`${BASE}/api/sync/run`);
  assert.equal(cron.status(), 401);
});

await step("no uncaught browser errors on mobile journey", async () => {
  if (m.errors.length) console.error(m.errors.slice(0, 5));
  assert.deepEqual(m.errors, []);
});

console.log("Desktop (1440×900):");
const d = await newPage({ width: 1440, height: 900 }, false);
await step("desktop homepage + templates + editor screenshots", async () => {
  await d.page.goto(BASE, { waitUntil: "networkidle" });
  await noOverflow(d.page);
  await d.page.screenshot({ path: `${OUT}/d-01-home.png` });
  await d.page.screenshot({ path: `${OUT}/d-01-home-full.png`, fullPage: true });
  await d.page.goto(`${BASE}/templates`, { waitUntil: "networkidle" });
  await d.page.screenshot({ path: `${OUT}/d-02-templates.png` });
  await d.page.goto(`${BASE}/editor/new?template=rose-garden-bouquet`, { waitUntil: "networkidle" });
  await d.page.getByLabel(/Their name/).fill("Ira");
  await d.page.getByRole("tab", { name: "Bouquet" }).click();
  await d.page.waitForTimeout(1200);
  await d.page.screenshot({ path: `${OUT}/d-03-editor.png` });
  await d.page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await d.page.screenshot({ path: `${OUT}/d-04-create.png` });
  await d.page.goto(`${BASE}/example`, { waitUntil: "networkidle" });
  await d.page.getByRole("button", { name: "Open your letter" }).click();
  await d.page.waitForTimeout(2200);
  await d.page.screenshot({ path: `${OUT}/d-05-example-open.png` });
  assert.deepEqual(d.errors, []);
});

await browser.close();
writeFileSync(`${OUT}/result.json`, JSON.stringify({ passed, failures }, null, 2));
console.log(`\n${passed} e2e checks passed, ${failures.length} failed.`);
process.exit(failures.length ? 1 : 0);
