import Link from "next/link";
import type { Template } from "@/lib/catalog";
import { defaultConfig, FORMAT_INFO, mergeConfig } from "@/lib/gift";
import { Bouquet } from "@/components/gift/bouquet";

export function TemplatePreview({ t, className = "" }: { t: Template; className?: string }) {
  const font = t.preview.font === "hand" ? "hand text-[34px]" : t.preview.font === "serif" ? "display text-[28px]" : "text-2xl font-semibold";
  if (t.format === "bouquet") {
    const cfg = mergeConfig(defaultConfig("bouquet"), t.config);
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ background: t.preview.bg }}>
        <Bouquet bouquet={cfg.bouquet} animate={false} className="absolute inset-x-0 -bottom-6 mx-auto h-[115%]" label={`${t.title} bouquet preview`} />
      </div>
    );
  }
  return (
    <div className={`relative flex items-center justify-center overflow-hidden p-6 ${className}`} style={{ background: t.preview.bg }}>
      <div
        className="w-[78%] -rotate-2 rounded-md px-5 py-6 shadow-[var(--shadow-paper)]"
        style={{ background: t.preview.bg === "#ffffff" || t.preview.bg === "#fffdf9" || t.preview.bg === "#fffbf7" ? "#fffdf9" : "rgb(255 255 255 / 0.12)" }}
      >
        <p className={`${font} leading-tight`} style={{ color: t.preview.ink }}>
          {t.preview.sample}
        </p>
        <div className="mt-3 space-y-1.5" aria-hidden="true">
          <div className="h-1.5 w-full rounded" style={{ background: t.preview.ink, opacity: 0.18 }} />
          <div className="h-1.5 w-4/5 rounded" style={{ background: t.preview.ink, opacity: 0.18 }} />
        </div>
      </div>
    </div>
  );
}

export function TemplateCard({ t }: { t: Template }) {
  return (
    <Link href={`/templates/${t.slug}`} className="group flex flex-col gap-3 rounded-[var(--radius-card)] focus-visible:outline-offset-4">
      <div className="relative">
        <TemplatePreview t={t} className="aspect-[5/4] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)]" />
        <span className={`absolute left-3 top-3 badge ${t.premium ? "badge-premium" : "badge-free"}`}>{t.premium ? "Premium" : "Free"}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="font-semibold text-ink group-hover:text-berry">{t.title}</h3>
        <span className="shrink-0 text-sm text-ink-mute">{FORMAT_INFO[t.format].label}</span>
      </div>
    </Link>
  );
}
