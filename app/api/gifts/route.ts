import { z } from "zod";
import { dbError, fail, GIFT_SELECT, giftColumns, json, rateLimit, requireUser, syncSoon, toRecord, type GiftRow } from "@/lib/api";
import { parseConfig } from "@/lib/gift";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("gifts").select(GIFT_SELECT).order("updated_at", { ascending: false }).limit(200);
  if (error) return dbError(error);
  return json({ gifts: (data as GiftRow[]).map(toRecord) });
}

const Body = z.object({ config: z.unknown() });

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!rateLimit(`create:${auth.user.id}`, 20, 60_000)) return fail("Too many requests — slow down a little.", 429);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request.");
  const parsed = parseConfig(body.data.config);
  if (!parsed.ok) return fail(parsed.error, 422);
  const { data, error } = await auth.supabase
    .from("gifts")
    .insert({ owner_id: auth.user.id, ...giftColumns({ ...parsed.config, photos: { items: [] } }) })
    .select(GIFT_SELECT)
    .single();
  if (error) return dbError(error);
  syncSoon();
  return json({ gift: toRecord(data as GiftRow) }, 201);
}
