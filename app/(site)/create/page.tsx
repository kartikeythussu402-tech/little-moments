import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Sticker } from "@/components/gift/stickers";
import { FlowerIcon } from "@/components/gift/flowers";
import { TemplateCard } from "@/components/site/template-card";
import { getOccasion, TEMPLATES } from "@/lib/catalog";
import { FORMAT_INFO, GIFT_FORMATS, type GiftFormat } from "@/lib/gift";

export const metadata: Metadata = { title: "Create a gift", description: "Choose a letter, a virtual bouquet or an interactive surprise and personalise it in minutes." };

const ICONS: Record<GiftFormat, React.ReactNode> = {
  letter: <Sticker kind="envelope" size={44} />,
  bouquet: <FlowerIcon kind="rose" size={44} />,
  combo: <FlowerIcon kind="marigold" size={44} />,
  giftbox: <Sticker kind="heart" size={44} />,
  reasons: <Sticker kind="sparkle" size={44} />,
  timeline: <Sticker kind="star" size={44} />,
  festival: <Sticker kind="diya" size={44} />,
  countdown: <Sticker kind="cake" size={44} />,
};

function editorHref(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
  return `/editor/new?${q.toString()}`;
}

export default async function CreatePage(props: PageProps<"/create">) {
  const sp = await props.searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined));
  const occasion = getOccasion(one("occasion"));
  const format = GIFT_FORMATS.includes(one("format") as GiftFormat) ? (one("format") as GiftFormat) : null;

  if (!format) {
    return (
      <div className="container-page py-12 sm:py-16">
        <p className="eyebrow">Step 1 of 2</p>
        <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">What would you like to make?</h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">
          {occasion ? (
            <>
              For <strong className="text-ink">{occasion.name}</strong>. Pick a format — you can add or remove parts later.
            </>
          ) : (
            "Pick a format — you can add or remove parts later. No occasion needed."
          )}
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GIFT_FORMATS.map((f) => (
            <li key={f}>
              <Link
                href={`/create?format=${f}${occasion ? `&occasion=${occasion.slug}` : ""}`}
                className="card group flex h-full flex-col gap-3 p-6 transition-all hover:-translate-y-1 hover:border-blush-400 hover:shadow-[var(--shadow-lift)]"
              >
                {ICONS[f]}
                <h2 className="text-lg font-semibold text-ink group-hover:text-berry">{FORMAT_INFO[f].label}</h2>
                <p className="text-sm leading-relaxed text-ink-soft">{FORMAT_INFO[f].description}</p>
                <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-semibold text-berry">
                  Choose <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const matches = TEMPLATES.filter((t) => t.format === format || (format === "combo" && t.format === "letter"));
  const sorted = occasion ? [...matches].sort((a, b) => Number(b.occasions.includes(occasion.slug)) - Number(a.occasions.includes(occasion.slug))) : matches;

  return (
    <div className="container-page py-12 sm:py-16">
      <Link href={`/create${occasion ? `?occasion=${occasion.slug}` : ""}`} className="btn btn-ghost -ml-3 mb-4">
        <ArrowLeft size={16} aria-hidden="true" /> Change format
      </Link>
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">Choose a starting point</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-soft">
        {FORMAT_INFO[format].label}
        {occasion ? ` · ${occasion.name}` : ""}. Everything is editable.
      </p>
      <div className="mt-10 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={editorHref({ format, occasion: occasion?.slug })}
          className="flex aspect-[5/4] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-blush-400 bg-cream p-6 text-center transition-colors hover:bg-white"
        >
          <span className="display text-2xl text-ink">Start blank</span>
          <span className="text-sm text-ink-soft">Good defaults, your own words.</span>
          <span className="btn btn-primary btn-sm mt-2">Start</span>
        </Link>
        {sorted.map((t) => (
          <div key={t.slug} className="flex flex-col gap-3">
            <TemplateCard t={t} />
            <Link href={editorHref({ template: t.slug, format, occasion: occasion?.slug })} className="btn btn-secondary btn-sm self-start">
              Use this template
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
