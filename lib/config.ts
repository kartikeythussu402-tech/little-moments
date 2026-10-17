/** Public, non-secret configuration shared by server and client code. */

export const CONTACT = {
  email: "littlemomentsforyourlovedonce@gmail.com",
  phones: [
    { display: "+91 95698 84116", tel: "+919569884116" },
    { display: "+91 78969 27604", tel: "+917896927604" },
  ],
} as const;

export const BRAND = {
  name: "Little Moments",
  promise: "Create something personal. Make someone feel special. Share the moment.",
} as const;

export const POLICY_VERSION = "2026-10-12";

export const LIMITS = {
  photosPerGiftFree: 3,
  photoMaxBytes: 5 * 1024 * 1024,
  photoTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxStems: 12,
  maxItems: 12,
  maxBodyChars: 4000,
};

export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

/** True when the real Supabase backend is configured. Otherwise the app runs in demo mode. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref"),
);
