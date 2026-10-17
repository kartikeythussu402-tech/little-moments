import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";
import { parseConfig, type GiftConfig } from "./gift";
import { supabaseAdmin } from "./supabase/admin";

export interface PublishedGift {
  id: string;
  slug: string;
  config: GiftConfig;
  publishedAt: string | null;
  photoUrls: Record<string, string>;
}

const SLUG_RE = /^[A-Za-z0-9_-]{10,40}$/;

/** Loads a published, shareable gift by slug, with short-lived signed photo URLs.
 *  Uses the anon key + security-definer RPC, so drafts/disabled links never leak. */
export const getPublishedGift = cache(async (slug: string): Promise<PublishedGift | null> => {
  if (!isSupabaseConfigured || !SLUG_RE.test(slug)) return null;
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.rpc("get_published_gift", { p_slug: slug });
  if (error || !data) return null;
  const row = data as { id: string; slug: string; config: unknown; published_at: string | null; media: Array<{ id: string; path: string }> };
  const parsed = parseConfig(row.config);
  if (!parsed.ok) return null;

  // Only sign paths that genuinely belong to this gift (never trust paths inside config).
  const owned = new Set(row.media.map((m) => m.path));
  const paths = parsed.config.photos.items.map((p) => p.ref).filter((r) => owned.has(r));
  const photoUrls: Record<string, string> = {};
  if (paths.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: signed } = await supabaseAdmin().storage.from("gift-media").createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) photoUrls[s.path] = s.signedUrl;
    });
  }
  return { id: row.id, slug: row.slug, config: parsed.config, publishedAt: row.published_at, photoUrls };
});
