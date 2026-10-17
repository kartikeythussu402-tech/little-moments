# Little Moments

**Create something personal. Make someone feel special. Share the moment.**

Little Moments is a mobile-first web app for making personal letters, virtual bouquets and small interactive gifts, then sending them as a private link on WhatsApp. The person receiving it opens it in one tap, with no account needed.

- **Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Google Sheets API · Vercel.
- **Design:** light-pink foundation, cream cards, berry accents, plum text. Young Serif for headlines, Figtree for UI, Caveat for handwriting. Every illustration is original SVG.

---

## 1. What works today

| Area | Status |
|---|---|
| Homepage, occasions (22), template library (15) with search and filters, pricing, privacy, terms, contact | ✅ Built and browser-tested |
| Create flow (8 gift formats), then template or blank, then editor | ✅ Built and browser-tested |
| Letter editor: tones with suggested lines, 5 paper styles, size and spacing, flower corners | ✅ Built and browser-tested |
| Bouquet builder: 7 original SVG flowers, +/− stems (max 12), wrap, ribbon, setting, card | ✅ Built and browser-tested |
| Gift box, reasons-why, memory timeline, birthday countdown, festival greeting with confetti, stickers, block reordering | ✅ Built |
| Live preview, full-screen preview, envelope and gift-box opening animations, reduced-motion support | ✅ Built and browser-tested |
| Publish, share link, Copy, WhatsApp, native share, link on/off switch | ✅ Built and browser-tested |
| Dashboard: edit, share, duplicate, delete | ✅ Built and browser-tested |
| **Demo mode** (no backend): everything above works, saved in the browser | ✅ Tested end-to-end |
| Supabase schema, row-level security, triggers, outbox, public gift lookup, storage rules | ✅ Tested on real Postgres (25 checks) |
| Sign-up (validated on the server, with consent), login, email verification, password reset, account settings, account deletion | ✅ Built · ⚙️ needs Supabase keys to run live |
| Private photo uploads (file-type check, 5 MB limit, 3 per gift, signed URLs) | ✅ Built (demo mode tested) · ⚙️ needs Supabase for live |
| **Google Sheets sync**: 7 worksheets, outbox, retries with backoff, no duplicates, erasure | ✅ Logic tested with a simulated Sheets API (14 checks) · ⚙️ needs your Google credentials for a real write |
| Admin monitor (`/admin`): users, sign-ups chart, gifts, contacts, sync status, retry | ✅ Built · ⚙️ needs Supabase plus one admin user |
| **Payments (Razorpay Standard Checkout)**: create order on the server, checkout modal, HMAC signature verification, cancel/failure handling | ✅ Built and tested with a simulated Razorpay API (15 checks) · ⚙️ do one real test-mode payment on your machine |
| AI writing help, regional languages, reminders | 🗓 Planned (Phase 5) |

> **Not yet verified against live services.** These were built and tested locally against simulated services, but have not run against a real Supabase project or a real Google Sheet, because those accounts are yours to create:
> - sign-up, login and saving to your account,
> - real photo uploads,
> - writing rows to a real Google Sheet,
> - the live deployment.
>
> Section 6 is a 10-minute checklist to confirm each one once your keys are in.

---

## 2. Try it in 2 minutes (demo mode, no accounts)

You need **Node.js 20.9 or newer**.

```bash
npm install
npm run dev
# open http://localhost:3000
```

With no Supabase keys, the app runs in **demo mode**:
- A yellow banner says so on every page.
- Gifts are saved in your browser, and share links open only in that browser.
- Sign-up and the contact form explain that they need the backend.

The whole create → publish → open journey works.

---

## 3. Connect Supabase (accounts, database, photos)

1. **Create a project.** Go to [supabase.com](https://supabase.com), create a new project, and choose the Mumbai region (closest to Indian users).

2. **Run the database setup.** Open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql` and click **Run**. Then do the same with `supabase/migrations/0002_seed_catalog.sql`.
   - Both files are safe to run again.
   - Together they create every table, the security rules (RLS), the triggers, the Google Sheets outbox and the private `gift-media` photo bucket (5 MB limit, JPG/PNG/WebP only).

3. **Set up authentication.** Go to **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` for now. Change it to your Vercel URL later.
   - Redirect URLs: add `http://localhost:3000/auth/callback` and `https://YOUR-SITE.vercel.app/auth/callback`.
   - In **Authentication → Providers → Email**, keep **Confirm email** on.

4. **Copy your keys.** Go to **Project Settings → API**, copy `.env.example` to `.env.local`, and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...      # secret: server only
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. **Restart.** Run `npm run dev`. The demo banner disappears and accounts are live.

6. **Make yourself an admin** so you can open `/admin`. Sign up in the app, then run this in the SQL Editor:
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```

> Supabase's built-in email sender has a low hourly limit. Before a real launch, add your own SMTP server under **Authentication → Emails → SMTP**.

---

## 4. Connect Google Sheets (mandatory reporting)

1. **Create the spreadsheet.** Make a new Google Sheet, for example "Little Moments – Ops". Copy its ID from the URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.

2. **Create a Google Cloud project and enable the API.** In [Google Cloud Console](https://console.cloud.google.com), create a project, then open **APIs & Services → Library**, search for **Google Sheets API** and click **Enable**.

3. **Create a service account.** Go to **IAM & Admin → Service Accounts** and click **Create**. Name it something like `little-moments-sync`; it doesn't need any project roles. Open it, go to **Keys → Add key → JSON**, and download the file.

4. **Share the sheet.** Click **Share** on the spreadsheet and add the service account's email (`…@….iam.gserviceaccount.com`) as an **Editor**.
   - Don't share the sheet with anyone else, and don't make it public.

5. **Add the credentials to `.env.local`.** Take the values from the JSON file:
   ```
   GOOGLE_SHEET_ID=the-id-from-step-1
   GOOGLE_SERVICE_ACCOUNT_EMAIL=client_email from the JSON
   GOOGLE_PRIVATE_KEY="private_key from the JSON, keep the \n escapes, keep the quotes"
   CRON_SECRET=any-long-random-string
   ```

6. **Create the worksheets and verify a real write:**
   ```bash
   npm run sheets:init -- --verify
   ```
   - This creates the 7 worksheets with their header rows: **Users, User_Submissions, Gift_Creations, Media_Metadata, Feedback_Contact, Orders_Payments, Consent_Audit**.
   - It never overwrites existing data. If a header row differs from what's expected, it reports that and leaves the row alone.
   - With `--verify`, it also writes and reads back a timestamp in a `_Healthcheck` sheet.

7. **Test it.** Sign up in the app. A row appears in **Users** within seconds. Make a gift and send a contact message to see their rows too. To push anything still queued, run `npm run sync:run` locally, or click **Sync now** on `/admin`.

### How the sync works

```
User action ─▶ API route (validates) ─▶ Postgres write
                                         └─ trigger writes a sync_events row in the SAME transaction (outbox)
after() hook / cron / admin ─▶ claim batch ─▶ build rows ─▶ Google Sheets (batched)
                                   │                          ├─ success → status = synced
                                   │                          └─ error   → status = failed, retry with backoff
                                   └─ per-row FIFO + advisory lock → never two workers on one row
```

- **Never loses data.** If Google is down, the sign-up or gift is still saved in Postgres, and its event waits in `sync_events`.
- **No duplicate rows.** Column A of each worksheet is a stable ID (`user_id`, `gift_id` and so on). A retry updates the same row instead of adding a new one.
- **Retries.** Waits 1 min, 2, 4, 8 and so on, up to 6 h. After 8 failed attempts an event is marked `dead`; you'll see it on `/admin` with its error and a **Retry failed** button.
- **Minimal data.** Letter text is **not** copied by default. Gift_Creations stores `ref:gifts/<id>` instead. Set `SHEETS_INCLUDE_MESSAGE_TEXT=true` only if you also update the privacy policy. Photos are never copied; only their metadata is.
- **Erasure.** Deleting an account blanks that user's names, emails, phones and messages in every worksheet. Only the consent audit record is kept.
- **Timing.** Rows sync a few seconds after each action through Next.js `after()`. Vercel Cron also runs `/api/sync/run` once a day as a safety net. That's the most a free Vercel Hobby plan allows; on Pro, change `vercel.json` to `*/10 * * * *`.

---

## 5. Deploy to Vercel

1. Push this folder to a GitHub repository. `.gitignore` already excludes `.env.local`.
2. In [vercel.com](https://vercel.com), click **Add New → Project**, import the repository, and keep the framework preset **Next.js**.
3. Under **Environment Variables**, add everything from your `.env.local`. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL, e.g. `https://little-moments.vercel.app`.
4. Click **Deploy**.
5. In Supabase, update the auth **Site URL** and **Redirect URLs** to the Vercel domain, as in step 3 of section 3.
6. The cron job in `vercel.json` is picked up automatically. Vercel sends `Authorization: Bearer $CRON_SECRET` with each run.

| Variable | Local | Production | Secret? |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✓ | ✓ | no |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | no (protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | **yes** |
| `GOOGLE_SHEET_ID` | ✓ | ✓ | yes |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✓ | ✓ | yes |
| `GOOGLE_PRIVATE_KEY` | ✓ | ✓ | **yes** |
| `CRON_SECRET` | optional | ✓ | **yes** |
| `SHEETS_INCLUDE_MESSAGE_TEXT` | optional | optional | no |
| `RAZORPAY_KEY_ID` | ✓ | ✓ | yes |
| `RAZORPAY_KEY_SECRET` | ✓ | ✓ | **yes** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✓ | ✓ | no (public key id) |

---

## 5½. Razorpay payments

**How it works**
1. The **Buy** button on `/pricing` calls `POST /api/create-order` with just a `productId`. Prices live on the server in `lib/payments.ts` (₹49 / ₹99 / ₹199), so nobody can change the amount from their browser.
2. The server creates a Razorpay order through the SDK and returns `{ order_id, amount, currency }`.
3. The browser loads `checkout.js` and opens the Razorpay modal for that order.
4. On success, the browser sends `razorpay_payment_id`, `razorpay_order_id` and `razorpay_signature` to `POST /api/verify-payment`.
5. The server checks `HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)` against the signature with a constant-time comparison. Only if they match:
   - In demo mode, it replies `verified`.
   - With Supabase on, it marks the `orders` row `paid`, adds an `entitlements` row, and syncs the order to the **Orders_Payments** sheet.

**Errors handled**
- Unknown product or bad request: 400.
- Razorpay rejects the keys: 401.
- Any other Razorpay error: 500.
- Missing fields or a wrong signature: 400, and the order is never marked paid.
- In the browser: closing the modal shows "Payment cancelled", `payment.failed` shows Razorpay's reason, and network errors show the payment ID so the customer can contact you.

**Environment variables** (in `.env.local` locally and in Vercel → Settings → Environment Variables):
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...           # server only
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

**Test payment** (test keys, no real money)
- UPI: `success@razorpay` succeeds, `failure@razorpay` fails.
- Card: `4111 1111 1111 1111`, any future expiry, any CVV, any name. If an OTP page appears, click **Success**.

**Going live**
1. Complete KYC in the Razorpay Dashboard.
2. Generate **live** keys (`rzp_live_…`) and swap them into the environment variables.
3. Redeploy.

The test-mode banner on `/pricing` disappears automatically. Premium features are not gated yet; everything stays unlocked during early access. Paying records an entitlement you can enforce later.

---

## 6. Post-deploy checklist (about 10 minutes)

- [ ] Open the site on your phone. The pink design loads and there's no demo banner.
- [ ] Sign up → the verification email arrives → clicking it logs you in → **Users** sheet: one row with your `user_id`, `email_verified = TRUE`, and terms/marketing consent.
- [ ] **Consent_Audit** has a terms row and a marketing row.
- [ ] Create a letter and bouquet, add a photo, then publish → **Gift_Creations** shows status `published_link_on`, **Media_Metadata** shows one row, **User_Submissions** shows `gift_created` and `gift_published`.
- [ ] Send the WhatsApp link to a second phone and open it in WhatsApp → the envelope opens and the photo shows.
- [ ] Turn the link off in the dashboard → the second phone now shows "This moment isn't available".
- [ ] Send the contact form → **Feedback_Contact** gets a row.
- [ ] `/admin` shows your counts and no failed syncs.
- [ ] Optional failure test: change `GOOGLE_SHEET_ID` to a wrong value and redeploy, sign up a test user (the account still works), then check `/admin` shows a failed event. Restore the correct value, click **Retry failed**, and check exactly one row appears.
- [ ] Delete the test account → its Users row is blanked and marked `deleted`.

---

## 7. Tests

```bash
npm run typecheck   # TypeScript: 0 errors
npm run lint        # ESLint: 0 problems
npm test            # 14 Google Sheets sync tests + 15 Razorpay tests (signature, tampering, auth failure, price can't be changed by the client…)
npm run test:db     # 25 database tests: the real migration on embedded Postgres (RLS, links, rate limits, outbox…)
npm run build       # production build
# Browser end-to-end (demo mode), needs `npm i -D playwright sharp && npx playwright install chromium`:
npm run build && npm start &  node tests/e2e/demo-journey.mjs http://localhost:3000
```

Latest results: **14/14 sync**, **25/25 database**, **25/25 end-to-end** in a real Chromium on a 390×844 phone and a 1440×900 desktop. The end-to-end run covers:
- the full journey: create → edit → bouquet → photo upload and rejecting a non-image → publish → open the recipient link → turn the link off → recipient blocked,
- duplicate and delete,
- filters and search,
- contact details on the page,
- legal pages,
- `/admin` hidden from non-admins,
- the API refusing to save anything in demo mode,
- no horizontal scrolling and no browser errors.

---

## 8. Security and privacy notes

**What's protected**
- **Database access:** every table has row-level security. Drafts are never public. Recipients can read a gift only through `get_published_gift(slug)`, which works only when the gift is published **and** its link is on.
- **Share links:** 22 random characters (122 bits), so they can't be guessed. Pages under `/gift/*` send `noindex` so search engines skip them.
- **Locked fields:** users can't change a gift's owner or link, or make themselves admin. Column privileges enforce this, and it's tested.
- **Photos:**
  - The file type is checked from the file's own bytes, not its name.
  - Files are stored in a private bucket and shown only through signed URLs that expire after 1 hour.
  - Only files recorded against that gift are ever signed.
- **Rate limits:** on sign-up, gift creation (also enforced in the database), uploads and the contact form.
- **Secrets:** the service-role key and Google key are used only in server code (`server-only` imports). Spreadsheet values are written as raw text, and text starting with `=` or `@` is escaped.

**Remaining risks before a public launch**
- Have the privacy policy and terms reviewed by a lawyer.
- Add your own SMTP for auth emails.
- Consider a shared rate limiter such as Upstash, because the in-memory one resets per server instance.
- Add virus scanning for uploads if usage grows.
- Turn on Supabase's daily backups.
- Social media links are left out on purpose, because no accounts were provided.

---

## 9. Project map

```
app/(site)/…          pages with header/footer (home, create, occasions, templates, dashboard, account, contact, legal, admin)
app/editor/[id]       full-screen editor  ·  app/gift/[slug]  recipient experience  ·  app/example  sample gift
app/api/…             gifts, media, contact, account, auth/signup, sync/run (cron)
components/gift/      original SVG flowers, bouquet arranger, letter, blocks, reveals, the single GiftRenderer
components/editor/    editor shell, panels, share sheet, form controls
lib/gift.ts           the gift config schema (one JSON config renders every experience)
lib/catalog.ts        occasions + templates (mirrored to the DB by scripts/gen-seed.ts)
lib/sheets/           worksheet schema, Google client, outbox worker, Supabase store
lib/repo/             data layer: ApiRepo (live) / LocalRepo (demo mode)
supabase/migrations/  schema, RLS, triggers, RPCs, storage, seed
tests/                sync unit tests, DB tests, browser end-to-end journey
```

To add a new gift experience:
1. Add a block kind in `lib/gift.ts`.
2. Add a renderer case in `components/gift/gift-renderer.tsx`.
3. Add fields to an editor panel.

No new pages are needed.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| Demo banner still showing | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or still placeholders. Restart `npm run dev` after editing `.env.local`. |
| Verification link says "expired" | Add `…/auth/callback` to Supabase **Redirect URLs** and check the **Site URL**. |
| `sheets:init` reports 403 | Share the spreadsheet with the service-account email as **Editor**. |
| `sheets:init` reports 404 | `GOOGLE_SHEET_ID` is wrong. Use only the ID part of the URL. |
| "invalid_grant" or key errors | `GOOGLE_PRIVATE_KEY` must keep its `\n` escapes and be wrapped in double quotes. |
| Rows not appearing | Open `/admin` to see pending or failed events and their errors, then click **Sync now** or run `npm run sync:run`. |
| Photo upload fails | Run migration `0001` again; it recreates the `gift-media` bucket and its policies. Only JPG, PNG and WebP up to 5 MB are accepted. |
| `/admin` shows 404 | Set `is_admin = true` for your profile (section 3, step 6). |

---

**Contact:** [littlemomentsforyourlovedonce@gmail.com](mailto:littlemomentsforyourlovedonce@gmail.com) · [+91 95698 84116](tel:+919569884116) · [+91 78969 27604](tel:+917896927604)
