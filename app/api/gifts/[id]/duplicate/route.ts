import { dbError, fail, GIFT_SELECT, giftColumns, json, requireUser, syncSoon, toRecord, type GiftRow } from "@/lib/api";
import { parseConfig } from "@/lib/gift";

export async function POST(_req: Request, ctx: RouteContext<"/api/gifts/[id]/duplicate">) {
  const { id } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { data: original } = await auth.supabase.from("gifts").select("config").eq("id", id).maybeSingle();
  if (!original) return fail("Not found", 404);
  const parsed = parseConfig(original.config);
  if (!parsed.ok) return fail(parsed.error, 422);
  // Photos belong to the original gift's private folder, so the copy starts without them.
  const config = { ...parsed.config, photos: { items: [] } };
  const { data, error } = await auth.supabase.from("gifts").insert({ owner_id: auth.user.id, ...giftColumns(config) }).select(GIFT_SELECT).single();
  if (error) return dbError(error);
  syncSoon();
  return json({ gift: toRecord(data as GiftRow) }, 201);
}
