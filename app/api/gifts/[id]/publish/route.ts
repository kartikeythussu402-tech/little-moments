import { dbError, fail, GIFT_SELECT, giftColumns, json, requireUser, syncSoon, toRecord, type GiftRow } from "@/lib/api";
import { parseConfig } from "@/lib/gift";
import { validateForPublish } from "@/lib/publish-rules";

export async function POST(req: Request, ctx: RouteContext<"/api/gifts/[id]/publish">) {
  const { id } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  const parsed = parseConfig(body?.config);
  if (!parsed.ok) return fail(parsed.error, 422);
  const problems = validateForPublish(parsed.config);
  if (problems.length) return fail(problems.join(" "), 422);

  const { data: media } = await auth.supabase.from("gift_media").select("id, storage_path").eq("gift_id", id);
  const owned = new Map((media ?? []).map((m) => [m.id as string, m.storage_path as string]));
  const config = { ...parsed.config, photos: { items: parsed.config.photos.items.filter((p) => owned.get(p.id) === p.ref) } };

  const { data, error } = await auth.supabase
    .from("gifts")
    .update({ ...giftColumns(config), status: "published" })
    .eq("id", id)
    .select(GIFT_SELECT)
    .maybeSingle();
  if (error) return dbError(error);
  if (!data) return fail("Not found", 404);
  syncSoon();
  return json({ gift: toRecord(data as GiftRow) });
}
