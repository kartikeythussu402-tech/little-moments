import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { TemplatePreviewLive } from "./preview";
import { buildStartingConfig, getOccasion, getTemplate, TEMPLATES } from "@/lib/catalog";
import { mergeConfig, FORMAT_INFO } from "@/lib/gift";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(props: PageProps<"/templates/[slug]">): Promise<Metadata> {
  const t = getTemplate((await props.params).slug);
  return t ? { title: `${t.title} template`, description: t.blurb } : {};
}

export default async function TemplatePage(props: PageProps<"/templates/[slug]">) {
  const { slug } = await props.params;
  const t = getTemplate(slug);
  if (!t) notFound();
  const sample = mergeConfig(buildStartingConfig({ templateSlug: t.slug }), { recipientName: "Ananya", senderName: "Rohan" });
  return (
    <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col gap-5">
        <Link href="/templates" className="text-sm font-semibold text-ink-soft hover:text-berry">← All templates</Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${t.premium ? "badge-premium" : "badge-free"}`}>{t.premium ? "Premium" : "Free"}</span>
          <span className="badge bg-blush-200 text-ink">{FORMAT_INFO[t.format].label}</span>
          <span className="badge bg-blush-200 text-ink">{t.style}</span>
        </div>
        <h1 className="display text-4xl text-ink sm:text-5xl">{t.title}</h1>
        <p className="text-lg leading-relaxed text-ink-soft">{t.blurb}</p>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-ink-mute">Great for</h2>
          <ul className="flex flex-wrap gap-2">
            {t.occasions.map((o) => (
              <li key={o}><Link href={`/occasions/${o}`} className="chip">{getOccasion(o)?.name ?? o}</Link></li>
            ))}
          </ul>
        </div>
        <Link href={`/editor/new?template=${t.slug}`} className="btn btn-primary btn-lg self-start">
          Use this template <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="text-sm text-ink-mute">The preview uses sample names. You&apos;ll write your own words.</p>
      </div>
      <TemplatePreviewLive config={sample} />
    </div>
  );
}
