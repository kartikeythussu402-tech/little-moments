import { z } from "zod";
import { dbError, fail, GIFT_SELECT, giftColumns, json, rateLimit, requireUser, syncSoon, toRecord, type GiftRow } from "@/lib/api";
import { parseConfig } from "@/lib/gift";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Id = z.uuid();

export async function GET(_req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return fail("Not found", 404);
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("gifts").select(GIFT_SELECT).eq("id", id).maybeSingle();
  if (error) return dbError(error);
  if (!data) return fail("Not found", 404);
  return json({ gift: toRecord(data as GiftRow) });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return fail("Not found", 404);
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!rateLimit(`save:${auth.user.id}`, 120, 60_000)) return fail("Saving too often — try again in a moment.", 429);
  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  const parsed = parseConfig(body?.config);
  if (!parsed.ok) return fail(parsed.error, 422);

  // Photos may only reference media rows that belong to this gift.
  const { data: media } = await auth.supabase.from("gift_media").select("id, storage_path").eq("gift_id", id);
  const owned = new Map((media ?? []).map((m) => [m.id as string, m.storage_path as string]));
  const config = { ...parsed.config, photos: { items: parsed.config.photos.items.filter((p) => owned.get(p.id) === p.ref) } };

  const { data, error } = await auth.supabase.from("gifts").update(giftColumns(config)).eq("id", id).select(GIFT_SELECT).maybeSingle();
  if (error) return dbError(error);
  if (!data) return fail("Not found", 404);
  syncSoon();
  return json({ gift: toRecord(data as GiftRow) });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return fail("Not found", 404);
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { data: media } = await auth.supabase.from("gift_media").select("storage_path").eq("gift_id", id);
  const { data, error } = await auth.supabase.from("gifts").delete().eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data?.length) return fail("Not found", 404);
  const paths = (media ?? []).map((m) => m.storage_path as string);
  if (paths.length) await supabaseAdmin().storage.from("gift-media").remove(paths);
  syncSoon();
  return json({ ok: true });
}
