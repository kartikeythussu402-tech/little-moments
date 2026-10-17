import { z } from "zod";
import { dbError, fail, json, rateLimit, requireUser, syncSoon } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Identify the real image type from its first bytes — never trust the browser's MIME. */
function sniff(buf: Uint8Array): { type: (typeof LIMITS.photoTypes)[number]; ext: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { type: "image/png", ext: "png" };
  const ascii = (a: number, b: number) => String.fromCharCode(...buf.slice(a, b));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { type: "image/webp", ext: "webp" };
  return null;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!rateLimit(`upload:${auth.user.id}`, 15, 60_000)) return fail("Too many uploads — wait a minute.", 429);

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > LIMITS.photoMaxBytes + 64 * 1024) return fail("Each photo must be 5 MB or smaller.", 413);
  const form = await req.formData().catch(() => null);
  const giftId = z.uuid().safeParse(form?.get("giftId"));
  const file = form?.get("file");
  if (!giftId.success || !(file instanceof File)) return fail("Choose a photo to upload.");
  if (file.size === 0) return fail("That file is empty.");
  if (file.size > LIMITS.photoMaxBytes) return fail("Each photo must be 5 MB or smaller.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return fail("Photos must be JPG, PNG or WebP.", 415);

  // Ownership via RLS: the user's own client can only see their gifts.
  const { data: gift } = await auth.supabase.from("gifts").select("id").eq("id", giftId.data).maybeSingle();
  if (!gift) return fail("Gift not found.", 404);
  const { count } = await auth.supabase.from("gift_media").select("id", { count: "exact", head: true }).eq("gift_id", giftId.data);
  if ((count ?? 0) >= LIMITS.photosPerGiftFree) return fail(`Free gifts can have up to ${LIMITS.photosPerGiftFree} photos.`, 409);

  const admin = supabaseAdmin();
  const path = `${auth.user.id}/${giftId.data}/${crypto.randomUUID()}.${kind.ext}`;
  const up = await admin.storage.from("gift-media").upload(path, bytes, { contentType: kind.type, upsert: false });
  if (up.error) {
    console.error("[upload]", up.error.message);
    return fail("Upload failed. Please try again.", 502);
  }
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `photo.${kind.ext}`;
  const { data: row, error } = await admin
    .from("gift_media")
    .insert({ gift_id: giftId.data, owner_id: auth.user.id, storage_path: path, file_name: safeName, file_type: kind.type, file_size: bytes.byteLength })
    .select("id")
    .single();
  if (error) {
    await admin.storage.from("gift-media").remove([path]);
    return dbError(error, "Upload failed. Please try again.");
  }
  syncSoon();
  return json({ photo: { id: row.id as string, ref: path } }, 201);
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const url = new URL(req.url);
  const id = z.uuid().safeParse(url.searchParams.get("id"));
  if (!id.success) return fail("Not found", 404);
  const { data, error } = await auth.supabase.from("gift_media").delete().eq("id", id.data).select("storage_path");
  if (error) return dbError(error);
  if (!data?.length) return fail("Not found", 404);
  await supabaseAdmin().storage.from("gift-media").remove(data.map((d) => d.storage_path as string));
  return json({ ok: true });
}
