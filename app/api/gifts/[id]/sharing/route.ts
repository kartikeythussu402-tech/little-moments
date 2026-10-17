import { z } from "zod";
import { dbError, fail, GIFT_SELECT, json, requireUser, syncSoon, toRecord, type GiftRow } from "@/lib/api";

const Body = z.object({ enabled: z.boolean() });

export async function POST(req: Request, ctx: RouteContext<"/api/gifts/[id]/sharing">) {
  const { id } = await ctx.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request.");
  const { data, error } = await auth.supabase.from("gifts").update({ sharing_enabled: body.data.enabled }).eq("id", id).select(GIFT_SELECT).maybeSingle();
  if (error) return dbError(error);
  if (!data) return fail("Not found", 404);
  syncSoon();
  return json({ gift: toRecord(data as GiftRow) });
}
