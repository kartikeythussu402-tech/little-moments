import { z } from "zod";
import { dbError, fail, json, rateLimit, requireUser, syncSoon } from "@/lib/api";
import { ProfileSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("profiles").select("full_name, phone, language, marketing_consent, account_status, created_at").eq("id", auth.user.id).maybeSingle();
  if (error) return dbError(error);
  return json({ profile: data, email: auth.user.email, emailVerified: Boolean(auth.user.email_confirmed_at) });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!rateLimit(`profile:${auth.user.id}`, 20, 60_000)) return fail("Too many changes — try again shortly.", 429);
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.", 422);
  const d = parsed.data;
  const { error } = await auth.supabase
    .from("profiles")
    .update({ full_name: d.fullName, phone: d.phone || null, language: d.language, marketing_consent: d.marketingConsent })
    .eq("id", auth.user.id);
  if (error) return dbError(error);
  syncSoon();
  return json({ ok: true });
}

/** Permanent account deletion: photos, gifts, profile and login are removed;
 *  personal data in the reporting sheet is blanked by a queued erase event.
 *  The consent audit trail is retained as described in the Privacy Policy. */
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = z.object({ confirm: z.literal("DELETE") }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail('Type DELETE to confirm.', 422);
  const uid = auth.user.id;
  const admin = supabaseAdmin();

  await admin.from("profiles").update({ account_status: "deletion_requested" }).eq("id", uid);
  const { data: media } = await admin.from("gift_media").select("storage_path").eq("owner_id", uid);
  const paths = (media ?? []).map((m) => m.storage_path as string);
  for (let i = 0; i < paths.length; i += 100) await admin.storage.from("gift-media").remove(paths.slice(i, i + 100));

  const { error: qErr } = await admin.from("sync_events").insert({ event_type: "user.erase", entity_key: uid, payload: { reason: "account_deleted" } });
  if (qErr) return dbError(qErr, "Couldn't start account deletion. Please try again.");
  const { error: gErr } = await admin.from("gifts").delete().eq("owner_id", uid);
  if (gErr) return dbError(gErr, "Couldn't delete your gifts. Please try again.");
  const { error: uErr } = await admin.auth.admin.deleteUser(uid);
  if (uErr) {
    console.error("[account-delete]", uErr.message);
    return fail("Your gifts were deleted but we couldn't remove your login. Please contact us and we'll finish it.", 500);
  }
  await auth.supabase.auth.signOut().catch(() => undefined);
  syncSoon();
  return json({ ok: true });
}
