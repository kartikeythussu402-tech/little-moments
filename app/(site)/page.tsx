import Link from "next/link";
import { ArrowRight, Gift, Heart, Link2, Lock, PenLine, Smartphone } from "lucide-react";
import { Bouquet } from "@/components/gift/bouquet";
import { FlowerIcon } from "@/components/gift/flowers";
import { Sticker } from "@/components/gift/stickers";
import { OccasionGrid } from "@/components/site/occasion-grid";
import { TemplateCard } from "@/components/site/template-card";
import { OCCASIONS, TEMPLATES } from "@/lib/catalog";
import { FLOWER_KINDS } from "@/lib/gift";
import { SAMPLE_GIFT } from "@/lib/sample";

const FAQ = [
  ["Does the person I'm sending to need an account?", "No. They tap the link and the gift opens — inside WhatsApp's browser or any phone browser. No app, no sign-up."],
  ["Who can see my letter?", "Only people who have the link. Links are long and random, so they can't be guessed. Drafts are always private, and you can switch a link off from your dashboard at any time."],
  ["Can I start without signing up?", "Yes. Start creating straight away. We'll only ask you to make a free account when you save or publish, so your gift is safe and you can edit it from any device."],
  ["Can I change a gift after I've sent it?", "Yes. Edits update the same link, so you never need to resend it."],
  ["Is it really free?", "Yes. Letters, bouquets, photos and share links are free. Optional premium extras are small one-time prices paid securely with Razorpay — you always see the price first."],
  ["Can I add photos?", "Yes — up to 3 photos per gift (JPG, PNG or WebP, up to 5 MB each). They're stored privately and only shown to people who open your link."],
];

const EXPERIENCES = [
  { format: "giftbox", title: "Gift box surprise", text: "A box they tap open, with a greeting, photos and a letter inside.", sticker: "heart" },
  { format: "reasons", title: "Reasons you're special", text: "Each reason revealed one tap at a time.", sticker: "sparkle" },
  { format: "timeline", title: "Memory timeline", text: "Your story, moment by moment, with dates and photos.", sticker: "envelope" },
  { format: "countdown", title: "Birthday countdown", text: "Counts down, then bursts into confetti on the day.", sticker: "cake" },
  { format: "festival", title: "Festival greeting", text: "Diwali, Holi, Rakhi, Eid, Christmas — with a little celebration.", sticker: "diya" },
] as const;

export default function HomePage() {
  const trending = ["rainy-day-letter", "marigold-morning", "open-when-box", "rose-garden-bouquet", "hundred-reasons", "rakhi-thread"]
    .map((s) => TEMPLATES.find((t) => t.slug === s)!)
    .filter(Boolean);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-blush-200 blur-3xl" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="flex flex-col gap-6 animate-rise">
            <p className="hand text-[28px] leading-none text-berry">for the people you love</p>
            <h1 className="display text-[44px] leading-[1.04] text-ink sm:text-6xl lg:text-[62px] xl:text-[68px]">
              Write it. Wrap it.
              <br />
              Send the feeling.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
              Personal letters, virtual bouquets and little interactive surprises — made on your phone in five minutes, opened in one tap on WhatsApp.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/create" className="btn btn-primary btn-lg shadow-[var(--shadow-lift)]">
                Create your gift
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/example" className="btn btn-secondary btn-lg">
                See what they&apos;ll receive
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
              <li className="flex items-center gap-2"><Heart size={16} className="text-berry" aria-hidden="true" />Free to start</li>
              <li className="flex items-center gap-2"><Lock size={16} className="text-berry" aria-hidden="true" />Private, unguessable links</li>
              <li className="flex items-center gap-2"><Smartphone size={16} className="text-berry" aria-hidden="true" />No app for them</li>
            </ul>
          </div>

          <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[500px]" aria-label="Example of a letter with a virtual bouquet" role="img">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blush-200 to-blush-300/70" aria-hidden="true" />
            <div className="absolute left-[6%] top-[9%] w-[62%] -rotate-[5deg] rounded-md bg-paper px-6 py-7 shadow-[var(--shadow-paper)] animate-rise" style={{ animationDelay: "150ms" }}>
              <p className="hand text-[30px] leading-none text-ink">Dear Ananya,</p>
              <p className="hand mt-3 text-[21px] leading-snug text-ink-soft">Five years since that rainy auto ride. I still save you the window seat…</p>
              <p className="hand mt-4 text-right text-[22px] text-marigold-deep">— always, R.</p>
            </div>
            <div className="absolute -bottom-[2%] right-[2%] w-[56%] animate-rise" style={{ animationDelay: "350ms" }}>
              <Bouquet bouquet={SAMPLE_GIFT.bouquet} bare className="w-full drop-shadow-[0_20px_30px_rgba(43,22,36,0.22)]" />
            </div>
            <div className="absolute bottom-[8%] left-[6%] flex items-center gap-2 rounded-full bg-cream/95 px-4 py-2 text-sm font-semibold text-ink shadow-[var(--shadow-soft)]" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-success" />
              Opened just now · via WhatsApp
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Occasions ───────── */}
      <section id="occasions" className="border-y border-line bg-cream/70">
        <div className="container-page flex flex-col gap-6 py-14 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Occasions</p>
              <h2 className="display mt-2 text-4xl text-ink">What&apos;s the moment?</h2>
            </div>
            <Link href="/occasions" className="btn btn-ghost">
              All occasions <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <OccasionGrid occasions={OCCASIONS} limit={8} />
          <p className="text-ink-soft">
            No reason needed —{" "}
            <Link href="/create?occasion=just-because" className="font-semibold text-berry underline underline-offset-4">
              start a just-because gift
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ───────── Letters + bouquets ───────── */}
      <section className="container-page grid gap-5 py-16 sm:py-20 lg:grid-cols-2">
        <div className="card flex flex-col gap-5 p-7 sm:p-10">
          <p className="eyebrow flex items-center gap-2">
            <PenLine size={15} aria-hidden="true" /> Letters
          </p>
          <h2 className="display text-[34px] leading-tight text-ink">Say the thing you never quite say out loud.</h2>
          <p className="text-lg leading-relaxed text-ink-soft">
            Pick a tone — romantic, playful, sorry, grateful — and we&apos;ll offer a gentle first line. Then it&apos;s all you. Five paper styles, from handwritten to minimal, sealed in an envelope they tap to open.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Letter styles">
            {["Handwritten", "Stationery", "Floral", "Minimal note", "Night ink"].map((s) => (
              <li key={s} className="rounded-full bg-blush-100 px-3.5 py-1.5 text-sm font-medium text-ink">
                {s}
              </li>
            ))}
          </ul>
          <Link href="/create?format=letter" className="btn btn-primary mt-auto self-start">
            Write a letter
          </Link>
        </div>
        <div className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-leaf-deep p-7 text-blush-50 shadow-[var(--shadow-soft)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-marigold">Virtual bouquets</p>
          <h2 className="display text-[34px] leading-tight text-white">Flowers that never wilt, delivered in a tap.</h2>
          <p className="text-lg leading-relaxed text-blush-200">
            Roses, tulips, sunflowers, lilies, daisies, marigolds and lotus. Choose your stems, a wrap and a ribbon, add a little card — and they watch it bloom.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Available flowers">
            {FLOWER_KINDS.map((k) => (
              <li key={k} className="rounded-full bg-white/10 p-1.5">
                <FlowerIcon kind={k} size={34} />
              </li>
            ))}
          </ul>
          <Link href="/create?format=bouquet" className="btn mt-auto self-start bg-marigold text-ink hover:brightness-95">
            Build a bouquet
          </Link>
        </div>
      </section>

      {/* ───────── Interactive experiences ───────── */}
      <section className="container-page flex flex-col gap-8 pb-16 sm:pb-20">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Gift size={15} aria-hidden="true" /> Interactive gifts
          </p>
          <h2 className="display mt-2 text-4xl text-ink">More than a message.</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {EXPERIENCES.map((e) => (
            <li key={e.format}>
              <Link href={`/create?format=${e.format}`} className="card group flex h-full flex-col gap-3 p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <Sticker kind={e.sticker} size={42} />
                <h3 className="font-semibold text-ink group-hover:text-berry">{e.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{e.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="border-y border-line bg-blush-200/60">
        <div className="container-page flex flex-col gap-10 py-16 sm:py-20">
          <h2 className="display text-4xl text-ink">Three steps. About five minutes.</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {[
              [PenLine, "Pick the moment", "Choose an occasion and a template — or start from a blank page. Everything comes with good defaults."],
              [Heart, "Make it theirs", "Their name, your words, a few photos, the flowers they love. The preview updates as you type."],
              [Link2, "Send the link", "Publish, tap WhatsApp, done. They open it without an account, and you can switch the link off anytime."],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof PenLine;
              return (
                <li key={i} className="flex flex-col gap-3 border-t-2 border-ink pt-5">
                  <span className="flex items-center gap-3">
                    <span className="display text-3xl text-berry">0{i + 1}</span>
                    <I size={20} className="text-ink-soft" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-semibold text-ink">{title as string}</h3>
                  <p className="leading-relaxed text-ink-soft">{text as string}</p>
                </li>
              );
            })}
          </ol>
          <Link href="/create" className="btn btn-primary btn-lg self-start">
            Start creating
          </Link>
        </div>
      </section>

      {/* ───────── Trending templates ───────── */}
      <section id="templates" className="container-page flex flex-col gap-8 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Templates</p>
            <h2 className="display mt-2 text-4xl text-ink">Loved this week</h2>
          </div>
          <Link href="/templates" className="btn btn-ghost">
            Browse all {TEMPLATES.length} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((t) => (
            <TemplateCard key={t.slug} t={t} />
          ))}
        </div>
      </section>

      {/* ───────── Free & premium ───────── */}
      <section className="container-page pb-16 sm:pb-20">
        <div className="card grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="flex flex-col gap-4">
            <p className="eyebrow">Free & premium</p>
            <h2 className="display text-[34px] leading-tight text-ink">Free to start. Small extras when you want them.</h2>
            <p className="text-lg leading-relaxed text-ink-soft">
              Letters, bouquets, photos and share links are free. Premium designs, more photos and bigger surprises are small one-time prices, paid securely with Razorpay — never a surprise charge.
            </p>
            <Link href="/pricing" className="btn btn-secondary self-start">
              See pricing
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Free", "Letters, bouquets, 3 photos, share links"],
              ["₹49", "Premium designs"],
              ["₹99", "Enhanced gift experiences"],
              ["₹199", "Big interactive surprises"],
            ].map(([price, text]) => (
              <div key={price} className="rounded-2xl bg-blush-100 p-4">
                <dt className="display text-2xl text-ink">{price}</dt>
                <dd className="mt-1 text-sm text-ink-soft">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── Testimonials (demo) ───────── */}
      <section className="border-y border-line bg-cream/70">
        <div className="container-page flex flex-col gap-8 py-16">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="display text-4xl text-ink">Little reactions</h2>
            <span className="badge badge-demo">Demo content — not real customers</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["She replied with a voice note that was mostly crying. Good crying.", "Sample user · anniversary letter"],
              ["Sent my brother a Rakhi bouquet from my hostel. He screenshotted it for the family group.", "Sample user · Raksha Bandhan"],
              ["Took four minutes on the metro. Felt like I'd written it by hand.", "Sample user · just because"],
            ].map(([quote, who]) => (
              <figure key={who} className="flex flex-col gap-4 rounded-2xl bg-blush-100 p-6">
                <blockquote className="hand text-[25px] leading-snug text-ink">“{quote}”</blockquote>
                <figcaption className="text-sm text-ink-mute">{who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="container-page grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 className="display mt-2 text-4xl text-ink">Questions, answered</h2>
          <p className="mt-4 text-ink-soft">
            Something else?{" "}
            <Link href="/contact" className="font-semibold text-berry underline underline-offset-4">
              Talk to us
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col">
          {FAQ.map(([q, a], i) => (
            <details key={q} className="group border-b border-line py-2" open={i === 0}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blush-200 text-berry transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="pb-4 pr-10 leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───────── Closing CTA ───────── */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-berry px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -left-10 -top-10 opacity-20" aria-hidden="true">
            <Sticker kind="heart" size={160} />
          </div>
          <h2 className="display relative text-4xl sm:text-5xl">Someone&apos;s waiting to feel special.</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-lg text-blush-100">Make it in minutes. Remember it for years.</p>
          <Link href="/create" className="btn btn-lg relative mt-8 bg-white text-berry hover:bg-blush-50">
            Create your gift
          </Link>
        </div>
      </section>
    </>
  );
}
