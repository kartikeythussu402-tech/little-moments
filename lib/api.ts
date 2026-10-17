import "server-only";
import { after, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getOccasion, getTemplate } from "./catalog";
import { isSupabaseConfigured } from "./config";
import type { GiftConfig, GiftRecord } from "./gift";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function fail(error: string, status = 400) {
  return json({ error }, status);
}

/** Resolve the signed-in user or return a 401 response. */
export async function requireUser(): Promise<{ user: User; supabase: Awaited<ReturnType<typeof supabaseServer>> } | { response: NextResponse }> {
  if (!isSupabaseConfigured) return { response: fail("The backend isn't configured (demo mode).", 503) };
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: fail("Please sign in to continue.", 401) };
  return { user: data.user, supabase };
}

/* Simple fixed-window rate limiter (per server instance). The database
   enforces hard limits too; this just blunts bursts cheaply. */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export interface GiftRow {
  id: string;
  slug: string;
  status: "draft" | "published";
  sharing_enabled: boolean;
  config: GiftConfig;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export function toRecord(r: GiftRow): GiftRecord {
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    sharingEnabled: r.sharing_enabled,
    config: r.config,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
  };
}

/** Columns derived from the config, kept in sync for querying/reporting. */
export function giftColumns(config: GiftConfig) {
  return {
    format: config.format,
    template_slug: getTemplate(config.templateSlug) ? config.templateSlug : null,
    occasion_slug: getOccasion(config.occasion) ? config.occasion : null,
    recipient_name: config.recipientName,
    relationship: config.relationship,
    config,
  };
}

export const GIFT_SELECT = "id, slug, status, sharing_enabled, config, created_at, updated_at, published_at";

/** Push queued outbox events to Google Sheets after the response is sent. */
export function syncSoon() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  after(async () => {
    try {
      const { runSync } = await import("./sheets/store");
      await runSync(supabaseAdmin(), 25);
    } catch (e) {
      console.error("[sheets-sync] deferred run failed (events stay queued):", (e as Error).message);
    }
  });
}

export function dbError(e: { message?: string; code?: string } | null, fallback = "Something went wrong. Please try again.") {
  const msg = e?.message ?? "";
  if (msg.includes("rate_limited")) return fail("You're creating gifts very quickly — please wait a few minutes.", 429);
  if (msg.includes("limit_reached")) return fail("Free gifts can have up to 3 photos.", 409);
  if (e?.code === "23514") return fail("Some details aren't valid. Please check and try again.", 422);
  console.error("[db]", msg);
  return fail(fallback, 500);
}
