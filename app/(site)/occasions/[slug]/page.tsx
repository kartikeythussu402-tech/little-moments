import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { TemplateCard } from "@/components/site/template-card";
import { getOccasion, OCCASIONS, templatesForOccasion, TEMPLATES } from "@/lib/catalog";

export function generateStaticParams() {
  return OCCASIONS.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata(props: PageProps<"/occasions/[slug]">): Promise<Metadata> {
  const o = getOccasion((await props.params).slug);
  return o ? { title: `${o.name} gifts & letters`, description: `Personal ${o.name.toLowerCase()} letters, bouquets and surprises you can send on WhatsApp.` } : {};
}

export default async function OccasionPage(props: PageProps<"/occasions/[slug]">) {
  const { slug } = await props.params;
  const occasion = getOccasion(slug);
  if (!occasion) notFound();
  const list = templatesForOccasion(slug);
  const more = TEMPLATES.filter((t) => !list.includes(t) && t.style !== "festive").slice(0, 3);
  return (
    <div className="container-page py-12 sm:py-16">
      <Link href="/occasions" className="text-sm font-semibold text-ink-soft hover:text-berry">← All occasions</Link>
      <p className="hand mt-4 text-3xl text-berry">{occasion.tagline}</p>
      <h1 className="display mt-1 text-4xl text-ink sm:text-5xl">{occasion.name}</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/create?occasion=${occasion.slug}`} className="btn btn-primary btn-lg">
          Create a {occasion.name.toLowerCase()} gift <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <h2 className="mt-14 text-xl font-bold">Templates for {occasion.name}</h2>
      {list.length ? (
        <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => <TemplateCard key={t.slug} t={t} />)}
        </div>
      ) : (
        <p className="mt-4 text-ink-soft">No dedicated templates yet — any letter or bouquet works beautifully.</p>
      )}
      {more.length > 0 && (
        <>
          <h2 className="mt-14 text-xl font-bold">These work for anything</h2>
          <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((t) => <TemplateCard key={t.slug} t={t} />)}
          </div>
        </>
      )}
    </div>
  );
}
