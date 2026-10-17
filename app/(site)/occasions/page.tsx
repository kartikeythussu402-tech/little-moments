import type { Metadata } from "next";
import Link from "next/link";
import { OccasionGrid } from "@/components/site/occasion-grid";
import { OCCASIONS } from "@/lib/catalog";

export const metadata: Metadata = { title: "Occasions", description: "Birthdays, anniversaries, Diwali, Rakhi, apologies, just-because — find the right gift for every moment." };

const GROUPS = [
  ["love", "Love & relationships"],
  ["life", "Life moments"],
  ["festival", "Festivals"],
  ["everyday", "Everyday"],
] as const;

export default function OccasionsPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Occasions</p>
      <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">Every moment deserves a little something</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-soft">
        Search, or browse by type. No occasion? <Link href="/create?occasion=just-because" className="font-semibold text-berry underline underline-offset-4">Just because</Link> is always welcome.
      </p>
      <div className="mt-8">
        <OccasionGrid occasions={OCCASIONS} />
      </div>
      <div className="mt-14 grid gap-10 md:grid-cols-2">
        {GROUPS.map(([g, label]) => (
          <section key={g}>
            <h2 className="mb-3 text-lg font-bold">{label}</h2>
            <ul className="flex flex-wrap gap-2">
              {OCCASIONS.filter((o) => o.group === g).map((o) => (
                <li key={o.slug}>
                  <Link href={`/occasions/${o.slug}`} className="chip">{o.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
