import { z } from "zod";
import { LIMITS } from "./config";

/* ────────────────────────────────────────────────────────────────
   A gift is ONE structured JSON config rendered by one renderer.
   New experiences = new block kind + renderer, never new pages.
   ──────────────────────────────────────────────────────────────── */

export const FLOWER_KINDS = ["rose", "tulip", "sunflower", "lily", "daisy", "marigold", "lotus"] as const;
export type FlowerKind = (typeof FLOWER_KINDS)[number];

export const BLOCK_KINDS = ["greeting", "letter", "bouquet", "photos", "reasons", "timeline", "countdown"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export const GIFT_FORMATS = ["letter", "bouquet", "combo", "giftbox", "reasons", "timeline", "festival", "countdown"] as const;
export type GiftFormat = (typeof GIFT_FORMATS)[number];

export const TONES = ["romantic", "playful", "apologetic", "grateful", "heartfelt", "celebratory"] as const;
export type Tone = (typeof TONES)[number];

export const PAPERS = ["handwritten", "stationery", "floral", "minimal", "night"] as const;
export const PALETTES = ["blush", "cream", "night", "marigold", "sage"] as const;
export const REVEALS = ["envelope", "giftbox", "fade", "none"] as const;
export const WRAPS = ["kraft", "silk", "blush", "ink"] as const;
export const RIBBONS = ["berry", "marigold", "cream", "sage"] as const;
export const BACKDROPS = ["blush", "cream", "night", "garden"] as const;
export const STICKERS = ["heart", "sparkle", "diya", "cake", "star", "envelope", "rakhi", "balloon"] as const;
export const RELATIONSHIPS = ["partner", "spouse", "crush", "friend", "best friend", "mother", "father", "sibling", "family", "colleague", "teacher", "someone special"] as const;

const shortText = (max: number) => z.string().trim().max(max);

export const letterSchema = z.object({
  title: shortText(80),
  greeting: shortText(80),
  body: shortText(LIMITS.maxBodyChars),
  closing: shortText(80),
  signature: shortText(60),
  tone: z.enum(TONES),
  paper: z.enum(PAPERS),
  fontSize: z.enum(["sm", "md", "lg"]),
  spacing: z.enum(["snug", "relaxed", "airy"]),
  flowers: z.boolean(),
});

export const bouquetSchema = z.object({
  stems: z.record(z.enum(FLOWER_KINDS), z.number().int().min(0).max(LIMITS.maxStems)),
  wrap: z.enum(WRAPS),
  ribbon: z.enum(RIBBONS),
  backdrop: z.enum(BACKDROPS),
  card: shortText(240),
});

export const photoSchema = z.object({
  id: z.string().max(80),
  /** Storage path (live) or data: URL (demo mode only). Never a public URL. */
  ref: z.string().max(3_000_000),
  caption: shortText(120),
});

export const configSchema = z.object({
  version: z.literal(1),
  format: z.enum(GIFT_FORMATS),
  templateSlug: z.string().max(80).nullable(),
  recipientName: shortText(60),
  senderName: shortText(60),
  occasion: z.string().max(60).nullable(),
  relationship: z.string().max(40).nullable(),
  theme: z.object({
    palette: z.enum(PALETTES),
    font: z.enum(["hand", "serif", "sans"]),
    decor: z.enum(["flowers", "hearts", "none"]),
  }),
  reveal: z.enum(REVEALS),
  confetti: z.boolean(),
  stickers: z.array(z.enum(STICKERS)).max(6),
  blocks: z.array(z.enum(BLOCK_KINDS)).min(1).max(BLOCK_KINDS.length),
  greeting: z.object({ headline: shortText(90), message: shortText(400) }),
  letter: letterSchema,
  bouquet: bouquetSchema,
  photos: z.object({ items: z.array(photoSchema).max(20) }),
  reasons: z.object({ title: shortText(90), items: z.array(shortText(200)).max(LIMITS.maxItems) }),
  timeline: z.object({
    title: shortText(90),
    items: z.array(z.object({ date: shortText(40), title: shortText(80), text: shortText(280) })).max(LIMITS.maxItems),
  }),
  countdown: z.object({ target: z.string().max(40), label: shortText(90) }),
});

export type GiftConfig = z.infer<typeof configSchema>;
export type LetterConfig = GiftConfig["letter"];
export type BouquetConfig = GiftConfig["bouquet"];

export type GiftStatus = "draft" | "published";

export interface GiftRecord {
  id: string;
  slug: string;
  status: GiftStatus;
  sharingEnabled: boolean;
  config: GiftConfig;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/* ───────────────────────── Defaults ───────────────────────── */

export const TONE_STARTERS: Record<Tone, { label: string; lines: string[]; closing: string }> = {
  romantic: {
    label: "Romantic",
    closing: "Yours, always",
    lines: [
      "I keep replaying the little things — the way you laugh before the joke ends, the way you save me the window seat.",
      "Some days I forget to say it, so here it is in writing: you are my favourite part of every day.",
      "If I could go back, I'd find you sooner — just to have more time with you.",
    ],
  },
  playful: {
    label: "Playful",
    closing: "Your favourite problem",
    lines: [
      "Official notice: you are stuck with me for another year. No refunds, no exchanges.",
      "I tried to find a gift as amazing as you. The shop said they don't stock that.",
      "Reminder that I am the reason your phone has 400 memes you never asked for.",
    ],
  },
  apologetic: {
    label: "Sorry",
    closing: "With love, and humility",
    lines: [
      "I was wrong, and I've been thinking about it all week. You deserved better from me.",
      "No excuses — I'm sorry. I'd really like to make it right, if you'll let me.",
      "I miss us. I'm sorry for my part in this. Can we talk?",
    ],
  },
  grateful: {
    label: "Grateful",
    closing: "Gratefully",
    lines: [
      "You showed up when I needed it most. I noticed, and I'll never forget it.",
      "Thank you for every quiet thing you do that nobody sees. I see it.",
      "I don't say thank you enough — so consider this a thousand of them.",
    ],
  },
  heartfelt: {
    label: "Heartfelt",
    closing: "All my heart",
    lines: [
      "Some people make the world softer just by being in it. You are one of them.",
      "Wherever life takes us, I hope you always know how loved you are.",
      "Thinking of you today, and every day in between.",
    ],
  },
  celebratory: {
    label: "Celebration",
    closing: "Cheers to you",
    lines: [
      "Today is all about you — and honestly, it should be every day.",
      "Here's to new beginnings, big dreams, and you making all of them happen.",
      "You did it! I'm so proud of you I could burst.",
    ],
  },
};

export const FORMAT_INFO: Record<GiftFormat, { label: string; description: string; blocks: BlockKind[]; reveal: GiftConfig["reveal"]; confetti: boolean }> = {
  letter: { label: "Letter", description: "A heartfelt letter that opens from a sealed envelope.", blocks: ["letter"], reveal: "envelope", confetti: false },
  bouquet: { label: "Virtual bouquet", description: "Pick the stems, wrap it, add a little card.", blocks: ["bouquet"], reveal: "fade", confetti: false },
  combo: { label: "Letter + bouquet + photos", description: "The full moment: words, flowers and your favourite pictures.", blocks: ["letter", "bouquet", "photos"], reveal: "envelope", confetti: false },
  giftbox: { label: "Gift box surprise", description: "A box they tap open, with surprises inside, one after another.", blocks: ["greeting", "photos", "letter"], reveal: "giftbox", confetti: true },
  reasons: { label: "Reasons why you're special", description: "A list of reasons they get to reveal one at a time.", blocks: ["reasons", "letter"], reveal: "giftbox", confetti: false },
  timeline: { label: "Memory timeline", description: "Your story so far, moment by moment.", blocks: ["timeline", "photos", "letter"], reveal: "fade", confetti: false },
  festival: { label: "Festival greeting", description: "A warm festive wish with a little celebration.", blocks: ["greeting", "bouquet"], reveal: "fade", confetti: true },
  countdown: { label: "Birthday countdown", description: "A countdown that unlocks your message on the big day.", blocks: ["countdown", "greeting", "letter"], reveal: "fade", confetti: true },
};

export function emptyStems(): Record<FlowerKind, number> {
  return Object.fromEntries(FLOWER_KINDS.map((k) => [k, 0])) as Record<FlowerKind, number>;
}

export function defaultConfig(format: GiftFormat = "letter"): GiftConfig {
  const info = FORMAT_INFO[format];
  const stems = emptyStems();
  stems.rose = 3;
  stems.marigold = 2;
  stems.daisy = 2;
  return {
    version: 1,
    format,
    templateSlug: null,
    recipientName: "",
    senderName: "",
    occasion: null,
    relationship: null,
    theme: { palette: "blush", font: "hand", decor: "flowers" },
    reveal: info.reveal,
    confetti: info.confetti,
    stickers: [],
    blocks: [...info.blocks],
    greeting: { headline: "A little something for you", message: "" },
    letter: {
      title: "",
      greeting: "Dear {name},",
      body: TONE_STARTERS.heartfelt.lines[0],
      closing: TONE_STARTERS.heartfelt.closing,
      signature: "",
      tone: "heartfelt",
      paper: "handwritten",
      fontSize: "md",
      spacing: "relaxed",
      flowers: true,
    },
    bouquet: { stems, wrap: "kraft", ribbon: "berry", backdrop: "blush", card: "" },
    photos: { items: [] },
    reasons: { title: "Reasons you're special", items: ["Your laugh fixes bad days.", "You remember the small things.", "You make ordinary plans feel like adventures."] },
    timeline: {
      title: "Our story so far",
      items: [
        { date: "The beginning", title: "The day we met", text: "" },
        { date: "Later", title: "A favourite memory", text: "" },
      ],
    },
    countdown: { target: "", label: "Something special opens in" },
  };
}

/** Deep-merge a partial override (from a template) into a base config. */
export function mergeConfig(base: GiftConfig, patch: DeepPartial<GiftConfig>): GiftConfig {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const current = (base as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && current && typeof current === "object" && !Array.isArray(current)) {
      out[k] = mergeConfig(current as GiftConfig, v as DeepPartial<GiftConfig>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as GiftConfig;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };

/** Replace {name} placeholders with the recipient's name. */
export function personalise(text: string, cfg: Pick<GiftConfig, "recipientName">): string {
  return text.replaceAll("{name}", cfg.recipientName.trim() || "you");
}

export function totalStems(stems: Record<string, number>): number {
  return Object.values(stems).reduce((a, b) => a + (b || 0), 0);
}

/** Validate + normalise unknown input (e.g. older drafts) into a GiftConfig. */
export function parseConfig(input: unknown): { ok: true; config: GiftConfig } | { ok: false; error: string } {
  const base = defaultConfig(
    typeof input === "object" && input && GIFT_FORMATS.includes((input as { format?: GiftFormat }).format as GiftFormat)
      ? (input as { format: GiftFormat }).format
      : "letter",
  );
  const merged = typeof input === "object" && input ? mergeConfig(base, input as DeepPartial<GiftConfig>) : base;
  const res = configSchema.safeParse(merged);
  if (!res.success) {
    const first = res.error.issues[0];
    return { ok: false, error: `${first.path.join(".") || "config"}: ${first.message}` };
  }
  if (totalStems(res.data.bouquet.stems) > LIMITS.maxStems) {
    return { ok: false, error: `A bouquet can have at most ${LIMITS.maxStems} stems.` };
  }
  return { ok: true, config: res.data };
}

/** Minimised, non-sensitive design summary — what reporting is allowed to see. */
export function designSummary(cfg: GiftConfig) {
  return {
    format: cfg.format,
    template: cfg.templateSlug,
    blocks: cfg.blocks,
    palette: cfg.theme.palette,
    reveal: cfg.reveal,
    confetti: cfg.confetti,
    letter: cfg.blocks.includes("letter") ? { tone: cfg.letter.tone, paper: cfg.letter.paper } : undefined,
    bouquet: cfg.blocks.includes("bouquet")
      ? { stems: Object.fromEntries(Object.entries(cfg.bouquet.stems).filter(([, n]) => n > 0)), wrap: cfg.bouquet.wrap, ribbon: cfg.bouquet.ribbon, backdrop: cfg.bouquet.backdrop }
      : undefined,
    photos: cfg.photos.items.length,
    stickers: cfg.stickers,
  };
}
