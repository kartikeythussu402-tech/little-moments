"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GiftRenderer } from "@/components/gift/gift-renderer";
import type { GiftRecord } from "@/lib/gift";
import { LocalRepo } from "@/lib/repo/local-repo";
import { Unavailable } from "./unavailable";

/** Demo mode only: reads the published gift from this browser's local storage. */
export function DemoGiftView({ slug }: { slug: string }) {
  const [state, setState] = useState<{ loading: boolean; gift: GiftRecord | null }>({ loading: true, gift: null });
  useEffect(() => {
    new LocalRepo().getBySlug(slug).then((gift) => setState({ loading: false, gift }));
  }, [slug]);
  if (state.loading) {
    return (
      <div className="flex min-h-svh items-center justify-center" role="status">
        <Loader2 className="animate-spin text-berry" size={32} aria-hidden="true" />
        <span className="sr-only">Opening…</span>
      </div>
    );
  }
  if (!state.gift) return <Unavailable demo />;
  const urls = Object.fromEntries(state.gift.config.photos.items.map((p) => [p.ref, p.ref]));
  return <GiftRenderer config={state.gift.config} photoUrls={urls} />;
}
