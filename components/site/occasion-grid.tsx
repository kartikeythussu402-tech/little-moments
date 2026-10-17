"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Occasion } from "@/lib/catalog";

const GROUP_STYLE: Record<Occasion["group"], string> = {
  love: "bg-berry text-white hover:bg-berry-deep",
  life: "bg-cream text-ink border border-line hover:border-blush-400",
  festival: "bg-marigold text-ink hover:brightness-95",
  everyday: "bg-blush-200 text-ink hover:bg-blush-300",
};

export function OccasionGrid({ occasions, limit, showSearch = true }: { occasions: Occasion[]; limit?: number; showSearch?: boolean }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const found = term ? occasions.filter((o) => `${o.name} ${o.tagline} ${o.slug}`.toLowerCase().includes(term)) : occasions;
    return limit && !term ? found.slice(0, limit) : found;
  }, [q, occasions, limit]);

  return (
    <div className="flex flex-col gap-5">
      {showSearch && (
        <label className="relative block max-w-md">
          <span className="sr-only">Search occasions</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: birthday, Rakhi, sorry…" className="field rounded-full pl-11" />
        </label>
      )}
      {list.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((o) => (
            <li key={o.slug}>
              <Link href={`/occasions/${o.slug}`} className={`flex min-h-24 flex-col justify-between rounded-2xl p-4 transition-all ${GROUP_STYLE[o.group]}`}>
                <span className="hand text-xl leading-none opacity-90">{o.tagline}</span>
                <span className="mt-3 font-semibold leading-tight">{o.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-cream p-6 text-ink-soft">
          No occasion matches “{q}”. You don&apos;t need one —{" "}
          <Link href="/create?occasion=just-because" className="font-semibold text-berry underline underline-offset-4">
            start a just-because gift
          </Link>
          .
        </p>
      )}
    </div>
  );
}
