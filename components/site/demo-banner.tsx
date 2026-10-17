import { isSupabaseConfigured } from "@/lib/config";

/** Shown on every page when the real backend isn't configured. */
export function DemoBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div role="status" className="bg-marigold/95 text-ink">
      <p className="container-page py-2 text-center text-sm font-semibold">
        Demo mode — the backend isn&apos;t connected yet. Gifts are saved in this browser only, and share links only open here.
      </p>
    </div>
  );
}
