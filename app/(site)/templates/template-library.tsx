"use client";
import { useMemo, useState } from "react";
import { TemplateCard } from "@/components/site/template-card";
import { OCCASIONS, STYLES, TEMPLATES } from "@/lib/catalog";
import { FORMAT_INFO, GIFT_FORMATS, RELATIONSHIPS } from "@/lib/gift";

export function TemplateLibrary() {
  const [q, setQ] = useState("");
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [format, setFormat] = useState("");
  const [rel, setRel] = useState("");
  const [price, setPrice] = useState("");

  const list = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (!q || `${t.title} ${t.blurb} ${t.style}`.toLowerCase().includes(q.toLowerCase())) &&
          (!occasion || t.occasions.includes(occasion)) &&
          (!style || t.style === style) &&
          (!format || t.format === format) &&
          (!rel || t.relationships.includes(rel)) &&
          (!price || (price === "free" ? !t.premium : t.premium)),
      ),
    [q, occasion, style, format, rel, price],
  );
  const reset = () => [setQ, setOccasion, setStyle, setFormat, setRel, setPrice].forEach((f) => f(""));
  const sel = "field min-h-10 py-0 text-sm";

  return (
    <div className="flex flex-col gap-8">
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="lg:col-span-2">
          <span className="sr-only">Search templates</span>
          <input type="search" className={sel} placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label><span className="sr-only">Occasion</span>
          <select className={sel} value={occasion} onChange={(e) => setOccasion(e.target.value)}>
            <option value="">Any occasion</option>
            {OCCASIONS.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Gift type</span>
          <select className={sel} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">Any gift type</option>
            {GIFT_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_INFO[f].label}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Style</span>
          <select className={sel} value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Any style</option>
            {STYLES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Relationship</span>
          <select className={sel} value={rel} onChange={(e) => setRel(e.target.value)}>
            <option value="">For anyone</option>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>For my {r}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
          {[["", "All"], ["free", "Free"], ["premium", "Premium"]].map(([v, l]) => (
            <button key={l} type="button" className="chip" aria-pressed={price === v} onClick={() => setPrice(v)}>{l}</button>
          ))}
          <span className="ml-auto text-sm text-ink-mute" aria-live="polite">{list.length} template{list.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      {list.length ? (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => <TemplateCard key={t.slug} t={t} />)}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-ink-soft">No templates match those filters.</p>
          <button type="button" className="btn btn-secondary mt-4" onClick={reset}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
