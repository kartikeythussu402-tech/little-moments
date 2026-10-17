import { clientIp, fail, json, rateLimit, syncSoon } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/config";
import { ContactSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return fail("The contact form needs the backend configured. Please email us instead.", 503);
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000)) return fail("You've sent a few messages already — please try again later or email us.", 429);
  const parsed = ContactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.", 422);
  if (parsed.data.website) return json({ ok: true }); // bot

  const { data: auth } = await (await supabaseServer()).auth.getUser();
  const { error } = await supabaseAdmin()
    .from("contact_submissions")
    .insert({ user_id: auth.user?.id ?? null, name: parsed.data.name, email: parsed.data.email, category: parsed.data.category, message: parsed.data.message });
  if (error) {
    console.error("[contact]", error.message);
    return fail("We couldn't save your message. Please email us directly.", 500);
  }
  syncSoon();
  return json({ ok: true }, 201);
}
