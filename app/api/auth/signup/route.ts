import { clientIp, fail, json, rateLimit, syncSoon } from "@/lib/api";
import { isSupabaseConfigured, POLICY_VERSION, siteUrl } from "@/lib/config";
import { safeNext, SignupSchema } from "@/lib/schemas";
import { supabaseServer } from "@/lib/supabase/server";

/** Server-validated signup. Profile, consent audit and the Users sheet row are
 *  created by database triggers in the same transaction as the auth user. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) return fail("Accounts need the backend configured (demo mode).", 503);
  if (!rateLimit(`signup:${clientIp(req)}`, 6, 10 * 60_000)) return fail("Too many sign-up attempts — please wait a few minutes.", 429);
  const parsed = SignupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.", 422);
  const d = parsed.data;
  const next = safeNext(d.next);
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        full_name: d.fullName,
        phone: d.phone ?? null,
        referral_source: d.referralSource || null,
        terms_accepted: true,
        marketing_consent: d.marketingConsent,
        policy_version: POLICY_VERSION,
      },
    },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("registered") || m.includes("exists")) return fail("An account with this email already exists. Try logging in.", 409);
    if (m.includes("password")) return fail(error.message, 422);
    console.error("[signup]", error.message);
    return fail("We couldn't create your account. Please try again.", 500);
  }
  syncSoon();
  // Supabase returns a user with no identities when the email is already taken (anti-enumeration).
  const exists = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
  return json({ ok: true, needsVerification: !data.session, next, alreadyRegistered: exists }, 201);
}
