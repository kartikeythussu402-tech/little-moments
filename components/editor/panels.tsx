"use client";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { OCCASIONS } from "@/lib/catalog";
import { LIMITS } from "@/lib/config";
import {
  BLOCK_KINDS,
  FLOWER_KINDS,
  RELATIONSHIPS,
  STICKERS,
  TONE_STARTERS,
  TONES,
  totalStems,
  type BlockKind,
  type DeepPartial,
  type GiftConfig,
} from "@/lib/gift";
import { PAPER } from "@/lib/theme";
import { getRepo, RepoError } from "@/lib/repo";
import { FlowerIcon, FLOWER_META } from "@/components/gift/flowers";
import { Sticker, STICKER_LABELS } from "@/components/gift/stickers";
import { ChoiceGroup, Section, SelectField, TextArea, TextField, Toggle } from "./fields";

export type SetConfig = (patch: DeepPartial<GiftConfig>) => void;
interface PanelProps {
  config: GiftConfig;
  set: SetConfig;
}

const BLOCK_LABEL: Record<BlockKind, string> = {
  greeting: "Greeting & stickers",
  letter: "Letter",
  bouquet: "Bouquet",
  photos: "Photos",
  reasons: "Reasons list",
  timeline: "Memory timeline",
  countdown: "Countdown",
};

/* ───────────────────────── Details ───────────────────────── */
export function DetailsPanel({ config, set }: PanelProps) {
  const toggleBlock = (b: BlockKind) => {
    const has = config.blocks.includes(b);
    if (has && config.blocks.length === 1) return;
    set({ blocks: has ? config.blocks.filter((x) => x !== b) : [...config.blocks, b] });
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...config.blocks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };
  return (
    <div className="flex flex-col gap-6">
      <Section title="Who is it for?">
        <TextField label="Their name" required value={config.recipientName} maxLength={60} placeholder="e.g. Ananya" onChange={(v) => set({ recipientName: v })} hint="Shown on the envelope and wherever you type {name}." />
        <TextField label="Your name" value={config.senderName} maxLength={60} placeholder="How they know you" onChange={(v) => set({ senderName: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Occasion"
            value={config.occasion ?? ""}
            placeholder="No particular occasion"
            options={OCCASIONS.map((o) => ({ value: o.slug, label: o.name }))}
            onChange={(v) => set({ occasion: v || null })}
          />
          <SelectField
            label="They are my…"
            value={config.relationship ?? ""}
            placeholder="Choose (optional)"
            options={RELATIONSHIPS.map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }))}
            onChange={(v) => set({ relationship: v || null })}
          />
        </div>
      </Section>
      <Section title="What's inside" description="Turn parts on or off and choose the order they appear in.">
        <ul className="flex flex-col gap-2">
          {config.blocks.map((b, i) => (
            <li key={b} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <span className="flex-1 font-semibold">{BLOCK_LABEL[b]}</span>
              <button type="button" className="btn btn-ghost btn-sm w-9 px-0" aria-label={`Move ${BLOCK_LABEL[b]} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={16} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm w-9 px-0" aria-label={`Move ${BLOCK_LABEL[b]} down`} disabled={i === config.blocks.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={16} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm w-9 px-0 text-danger" aria-label={`Remove ${BLOCK_LABEL[b]}`} disabled={config.blocks.length === 1} onClick={() => toggleBlock(b)}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        {config.blocks.length < BLOCK_KINDS.length && (
          <div className="flex flex-wrap gap-2">
            {BLOCK_KINDS.filter((b) => !config.blocks.includes(b)).map((b) => (
              <button key={b} type="button" className="chip" onClick={() => toggleBlock(b)}>
                <Plus size={14} aria-hidden="true" /> {BLOCK_LABEL[b]}
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function toLocalInput(iso: string) {
  const t = Date.parse(iso);
  if (!iso || Number.isNaN(t)) return "";
  const d = new Date(t - new Date(t).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

/* ───────────────────────── Message ───────────────────────── */
export function MessagePanel({ config, set }: PanelProps) {
  const l = config.letter;
  const [lineIdx, setLineIdx] = useState(0);
  const suggest = () => {
    const lines = TONE_STARTERS[l.tone].lines;
    const next = (lineIdx + 1) % lines.length;
    setLineIdx(next);
    set({ letter: { body: lines[next] } });
  };
  return (
    <div className="flex flex-col gap-6">
      {config.blocks.includes("greeting") && (
        <Section title="Greeting">
          <TextField label="Headline" value={config.greeting.headline} maxLength={90} onChange={(v) => set({ greeting: { headline: v } })} hint="Tip: {name} becomes their name." />
          <TextArea label="Short message" rows={3} maxLength={400} value={config.greeting.message} onChange={(v) => set({ greeting: { message: v } })} />
        </Section>
      )}

      {config.blocks.includes("letter") && (
        <Section title="Letter">
          <ChoiceGroup
            label="Tone"
            value={l.tone}
            options={TONES.map((t) => ({ value: t, label: TONE_STARTERS[t].label }))}
            onChange={(tone) => {
              setLineIdx(0);
              set({ letter: { tone, body: TONE_STARTERS[tone].lines[0], closing: TONE_STARTERS[tone].closing } });
            }}
          />
          <TextField label="Title (optional)" value={l.title} maxLength={80} placeholder="e.g. Five years of us" onChange={(v) => set({ letter: { title: v } })} />
          <TextField label="Greeting" value={l.greeting} maxLength={80} onChange={(v) => set({ letter: { greeting: v } })} />
          <div>
            <TextArea label="Your letter" rows={9} maxLength={LIMITS.maxBodyChars} value={l.body} onChange={(v) => set({ letter: { body: v } })} hint="Leave a blank line between paragraphs." />
            <button type="button" className="btn btn-ghost btn-sm mt-2 text-berry" onClick={suggest}>
              <Sparkles size={15} aria-hidden="true" /> Suggest another first line
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Closing" value={l.closing} maxLength={80} onChange={(v) => set({ letter: { closing: v } })} />
            <TextField label="Signature" value={l.signature} maxLength={60} placeholder={config.senderName || "Your name"} onChange={(v) => set({ letter: { signature: v } })} />
          </div>
        </Section>
      )}

      {config.blocks.includes("reasons") && <ListEditor config={config} set={set} />}
      {config.blocks.includes("timeline") && <TimelineEditor config={config} set={set} />}

      {config.blocks.includes("countdown") && (
        <Section title="Countdown" description="Everything else stays hidden until this moment.">
          <TextField
            label="Opens on"
            type="datetime-local"
            value={toLocalInput(config.countdown.target)}
            onChange={(v) => set({ countdown: { target: v ? new Date(v).toISOString() : "" } })}
          />
          <TextField label="Label" value={config.countdown.label} maxLength={90} onChange={(v) => set({ countdown: { label: v } })} />
        </Section>
      )}

      {config.blocks.includes("bouquet") && (
        <Section title="Bouquet card">
          <TextArea label="Little card with the flowers" rows={2} maxLength={240} value={config.bouquet.card} placeholder="e.g. For the next fifty monsoons." onChange={(v) => set({ bouquet: { card: v } })} />
        </Section>
      )}
    </div>
  );
}

function ListEditor({ config, set }: PanelProps) {
  const items = config.reasons.items;
  const update = (next: string[]) => set({ reasons: { items: next } });
  return (
    <Section title="Reasons" description="Each one is revealed with a tap.">
      <TextField label="Title" value={config.reasons.title} maxLength={90} onChange={(v) => set({ reasons: { title: v } })} />
      <ol className="flex flex-col gap-2">
        {items.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-sm font-bold text-ink-mute">{i + 1}</span>
            <input className="field" aria-label={`Reason ${i + 1}`} value={r} maxLength={200} onChange={(e) => update(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className="btn btn-ghost btn-sm w-9 px-0" aria-label={`Move reason ${i + 1} up`} disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; update(n); }}>
              <ArrowUp size={16} />
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-9 px-0 text-danger" aria-label={`Delete reason ${i + 1}`} onClick={() => update(items.filter((_, j) => j !== i))}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ol>
      {items.length < LIMITS.maxItems && (
        <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => update([...items, ""])}>
          <Plus size={15} aria-hidden="true" /> Add a reason
        </button>
      )}
    </Section>
  );
}

function TimelineEditor({ config, set }: PanelProps) {
  const items = config.timeline.items;
  const update = (next: typeof items) => set({ timeline: { items: next } });
  return (
    <Section title="Memory timeline">
      <TextField label="Title" value={config.timeline.title} maxLength={90} onChange={(v) => set({ timeline: { title: v } })} />
      {items.map((t, i) => (
        <fieldset key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
          <legend className="px-1 text-sm font-bold text-ink-soft">Moment {i + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
            <TextField label="When" value={t.date} maxLength={40} placeholder="June 2021" onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, date: v } : x)))} />
            <TextField label="What happened" value={t.title} maxLength={80} onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
          </div>
          <TextArea label="A few words" rows={2} maxLength={280} value={t.text} onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, text: v } : x)))} />
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; update(n); }}>
              <ArrowUp size={15} aria-hidden="true" /> Move up
            </button>
            <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => update(items.filter((_, j) => j !== i))}>
              <Trash2 size={15} aria-hidden="true" /> Remove
            </button>
          </div>
        </fieldset>
      ))}
      {items.length < LIMITS.maxItems && (
        <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => update([...items, { date: "", title: "", text: "" }])}>
          <Plus size={15} aria-hidden="true" /> Add a moment
        </button>
      )}
    </Section>
  );
}

/* ───────────────────────── Bouquet ───────────────────────── */
export function BouquetPanel({ config, set }: PanelProps) {
  const b = config.bouquet;
  const total = totalStems(b.stems);
  const change = (kind: (typeof FLOWER_KINDS)[number], delta: number) => {
    const n = (b.stems[kind] ?? 0) + delta;
    if (n < 0 || (delta > 0 && total >= LIMITS.maxStems)) return;
    set({ bouquet: { stems: { ...b.stems, [kind]: n } } });
  };
  return (
    <div className="flex flex-col gap-6">
      <Section title="Stems" description={`${total} of ${LIMITS.maxStems} stems`}>
        <ul className="flex flex-col gap-1">
          {FLOWER_KINDS.map((k) => (
            <li key={k} className="flex items-center gap-3 rounded-xl px-1 py-1">
              <FlowerIcon kind={k} size={36} />
              <span className="flex-1 font-semibold">{FLOWER_META[k].label}</span>
              <button type="button" className="btn btn-secondary h-11 w-11 px-0 text-xl" aria-label={`Remove one ${FLOWER_META[k].label.toLowerCase()}`} disabled={!b.stems[k]} onClick={() => change(k, -1)}>
                −
              </button>
              <output className="w-6 text-center text-lg font-bold tabular-nums" aria-label={`${FLOWER_META[k].label} count`}>
                {b.stems[k] ?? 0}
              </output>
              <button type="button" className="btn btn-primary h-11 w-11 px-0 text-xl" aria-label={`Add one ${FLOWER_META[k].label.toLowerCase()}`} disabled={total >= LIMITS.maxStems} onClick={() => change(k, 1)}>
                +
              </button>
            </li>
          ))}
        </ul>
        {total >= LIMITS.maxStems && <p className="text-sm font-medium text-marigold-deep">That&apos;s a full bouquet! Remove a stem to swap flowers.</p>}
      </Section>
      <Section title="Wrapping">
        <ChoiceGroup
          label="Paper"
          value={b.wrap}
          onChange={(wrap) => set({ bouquet: { wrap } })}
          options={[
            { value: "kraft", label: "Kraft", swatch: "#c9a77a" },
            { value: "silk", label: "Silk", swatch: "#f7eef5" },
            { value: "blush", label: "Blush", swatch: "#f2ccd7" },
            { value: "ink", label: "Ink", swatch: "#2f2540" },
          ]}
        />
        <ChoiceGroup
          label="Ribbon"
          value={b.ribbon}
          onChange={(ribbon) => set({ bouquet: { ribbon } })}
          options={[
            { value: "berry", label: "Berry", swatch: "#a3214a" },
            { value: "marigold", label: "Marigold", swatch: "#d99a2b" },
            { value: "cream", label: "Cream", swatch: "#fffbf7" },
            { value: "sage", label: "Sage", swatch: "#4e7a61" },
          ]}
        />
        <ChoiceGroup
          label="Setting"
          value={b.backdrop}
          onChange={(backdrop) => set({ bouquet: { backdrop } })}
          options={[
            { value: "blush", label: "Blush", swatch: "#f8e2e8" },
            { value: "cream", label: "Cream", swatch: "#fffaf3" },
            { value: "garden", label: "Garden", swatch: "#e3eee6" },
            { value: "night", label: "Night", swatch: "#231a33" },
          ]}
        />
      </Section>
    </div>
  );
}

/* ───────────────────────── Photos ───────────────────────── */
export function PhotosPanel({
  config,
  set,
  giftId,
  urls,
  needsSave,
  onRequestSave,
}: PanelProps & { giftId: string | null; urls: Record<string, string>; needsSave: boolean; onRequestSave: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = config.photos.items;
  const full = items.length >= LIMITS.photosPerGiftFree;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || !giftId) return;
    setError(null);
    const room = LIMITS.photosPerGiftFree - items.length;
    const chosen = Array.from(files).slice(0, room);
    let next = [...items];
    setBusy(true);
    try {
      for (const file of chosen) {
        if (!LIMITS.photoTypes.includes(file.type as (typeof LIMITS.photoTypes)[number])) throw new RepoError(`“${file.name}” isn't a JPG, PNG or WebP image.`, 415);
        if (file.size > LIMITS.photoMaxBytes) throw new RepoError(`“${file.name}” is larger than 5 MB.`, 413);
        const uploaded = await getRepo().uploadPhoto(giftId, file);
        next = [...next, { id: uploaded.id, ref: uploaded.ref, caption: "" }];
        set({ photos: { items: next } });
      }
      if (files.length > room) setError(`Only ${LIMITS.photosPerGiftFree} photos per gift — the rest were skipped.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (id: string) => {
    if (!giftId) return;
    setError(null);
    try {
      await getRepo().removePhoto(giftId, id);
      set({ photos: { items: items.filter((p) => p.id !== id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that photo.");
    }
  };

  if (needsSave) {
    return (
      <Section title="Photos" description="Up to 3 photos, stored privately.">
        <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center">
          <p className="text-ink-soft">Save your gift first so your photos are stored safely with it.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={onRequestSave}>
            Save & add photos
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Photos" description={`${items.length} of ${LIMITS.photosPerGiftFree} · JPG, PNG or WebP up to 5 MB. Only people with your link can see them.`}>
      {items.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-2">
              {urls[p.ref] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p.ref]} alt={p.caption || `Photo ${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-xl bg-blush-100 text-ink-mute">
                  <Loader2 className="animate-spin" size={20} aria-label="Loading photo" />
                </div>
              )}
              <input
                className="field min-h-10 text-sm"
                aria-label={`Caption for photo ${i + 1}`}
                placeholder="Add a caption"
                maxLength={120}
                value={p.caption}
                onChange={(e) => set({ photos: { items: items.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)) } })}
              />
              <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => remove(p.id)}>
                <Trash2 size={15} aria-hidden="true" /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept={LIMITS.photoTypes.join(",")} multiple className="sr-only" id="photo-input" onChange={(e) => onFiles(e.target.files)} disabled={busy || full} />
      <label
        htmlFor="photo-input"
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blush-400 bg-white p-5 text-center font-semibold text-berry transition-colors hover:bg-blush-50 ${busy || full ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
        {busy ? "Uploading…" : full ? "Photo limit reached" : "Add photos"}
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Section>
  );
}

/* ───────────────────────── Design ───────────────────────── */
export function DesignPanel({ config, set }: PanelProps) {
  const l = config.letter;
  const toggleSticker = (s: (typeof STICKERS)[number]) => {
    const has = config.stickers.includes(s);
    if (!has && config.stickers.length >= 6) return;
    set({ stickers: has ? config.stickers.filter((x) => x !== s) : [...config.stickers, s] });
  };
  return (
    <div className="flex flex-col gap-6">
      <Section title="Look & feel">
        <ChoiceGroup
          label="Colours"
          value={config.theme.palette}
          onChange={(palette) => set({ theme: { palette } })}
          options={[
            { value: "blush", label: "Blush", swatch: "#fcf0f3" },
            { value: "cream", label: "Cream", swatch: "#fbf6ee" },
            { value: "marigold", label: "Marigold", swatch: "#fcefd6" },
            { value: "sage", label: "Sage", swatch: "#e9f1eb" },
            { value: "night", label: "Night", swatch: "#1f1830" },
          ]}
        />
        <ChoiceGroup
          label="Headline lettering"
          value={config.theme.font}
          onChange={(font) => set({ theme: { font } })}
          options={[
            { value: "hand", label: "Handwritten" },
            { value: "serif", label: "Elegant serif" },
            { value: "sans", label: "Clean" },
          ]}
        />
        <ChoiceGroup
          label="Background details"
          value={config.theme.decor}
          onChange={(decor) => set({ theme: { decor } })}
          options={[
            { value: "flowers", label: "Flowers" },
            { value: "hearts", label: "Hearts" },
            { value: "none", label: "None" },
          ]}
        />
      </Section>

      {config.blocks.includes("letter") && (
        <Section title="Letter paper">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(PAPER) as Array<keyof typeof PAPER>).map((p) => (
              <button key={p} type="button" aria-pressed={l.paper === p} onClick={() => set({ letter: { paper: p } })} className="group flex flex-col items-stretch gap-1.5 text-left">
                <span className={`grid h-16 place-items-center rounded-xl border-2 text-xl ${PAPER[p].font} group-aria-pressed:border-berry`} style={{ background: PAPER[p].bg, color: PAPER[p].ink, borderColor: l.paper === p ? undefined : PAPER[p].border }}>
                  Dear…
                </span>
                <span className="text-sm font-semibold group-aria-pressed:text-berry">{PAPER[p].label}</span>
              </button>
            ))}
          </div>
          <ChoiceGroup label="Text size" value={l.fontSize} onChange={(fontSize) => set({ letter: { fontSize } })} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
          <ChoiceGroup label="Spacing" value={l.spacing} onChange={(spacing) => set({ letter: { spacing } })} options={[{ value: "snug", label: "Snug" }, { value: "relaxed", label: "Relaxed" }, { value: "airy", label: "Airy" }]} />
          <Toggle label="Flower corners" checked={l.flowers} onChange={(flowers) => set({ letter: { flowers } })} />
        </Section>
      )}

      <Section title="Opening moment">
        <ChoiceGroup
          label="How it opens"
          value={config.reveal}
          onChange={(reveal) => set({ reveal })}
          options={[
            { value: "envelope", label: "Sealed envelope" },
            { value: "giftbox", label: "Gift box" },
            { value: "fade", label: "Gentle fade" },
            { value: "none", label: "No animation" },
          ]}
        />
        <Toggle label="Confetti when it opens" hint="Skipped for people who prefer reduced motion." checked={config.confetti} onChange={(confetti) => set({ confetti })} />
      </Section>

      <Section title="Stickers" description="Shown with your greeting. Pick up to 6.">
        <div className="grid grid-cols-4 gap-2">
          {STICKERS.map((s) => (
            <button key={s} type="button" aria-pressed={config.stickers.includes(s)} onClick={() => toggleSticker(s)} className="flex flex-col items-center gap-1 rounded-xl border-2 border-transparent bg-white p-2 text-xs font-semibold aria-pressed:border-berry aria-pressed:bg-blush-50">
              <Sticker kind={s} size={34} />
              {STICKER_LABELS[s]}
            </button>
          ))}
        </div>
        {config.stickers.length > 0 && !config.blocks.includes("greeting") && (
          <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => set({ blocks: ["greeting", ...config.blocks] })}>
            Show stickers — add a greeting
          </button>
        )}
      </Section>
    </div>
  );
}
