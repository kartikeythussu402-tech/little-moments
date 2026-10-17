import { z } from "zod";
import { fail, json, requireUser } from "@/lib/api";

const Body = z.object({ refs: z.array(z.string().max(300)).max(20) });

/** Short-lived URLs so the OWNER can preview their private photos in the editor. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request.");
  const mine = body.data.refs.filter((r) => r.startsWith(`${auth.user.id}/`));
  if (!mine.length) return json({ urls: {} });
  // Storage RLS lets users sign only objects inside their own folder.
  const { data } = await auth.supabase.storage.from("gift-media").createSignedUrls(mine, 60 * 30);
  const urls: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  });
  return json({ urls });
}
