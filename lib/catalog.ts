import type { DeepPartial, GiftConfig, GiftFormat } from "./gift";
import { defaultConfig, mergeConfig, TONE_STARTERS } from "./gift";

/* Occasions and templates are versioned in code (so browsing works even in
   demo mode) and mirrored into the database by the migration's seed so gifts
   can reference them with foreign keys. Keep both in sync when editing. */

export interface Occasion {
  slug: string;
  name: string;
  tagline: string;
  group: "love" | "life" | "festival" | "everyday";
  tone: "romantic" | "playful" | "apologetic" | "grateful" | "heartfelt" | "celebratory";
}

export const OCCASIONS: Occasion[] = [
  { slug: "birthday", name: "Birthday", tagline: "Another year of you", group: "life", tone: "celebratory" },
  { slug: "anniversary", name: "Anniversary", tagline: "Still choosing you", group: "love", tone: "romantic" },
  { slug: "valentines-day", name: "Valentine's Day", tagline: "Be mine, again", group: "love", tone: "romantic" },
  { slug: "love-letter", name: "Love letter", tagline: "In my own words", group: "love", tone: "romantic" },
  { slug: "apology", name: "Apology", tagline: "Can we talk?", group: "love", tone: "apologetic" },
  { slug: "milestone", name: "First date & milestones", tagline: "Remember when", group: "love", tone: "romantic" },
  { slug: "friendship-day", name: "Friendship Day", tagline: "My person", group: "everyday", tone: "playful" },
  { slug: "wedding", name: "Wedding & engagement", tagline: "Happily ever after", group: "life", tone: "heartfelt" },
  { slug: "mothers-day", name: "Mother's Day", tagline: "For Maa", group: "life", tone: "grateful" },
  { slug: "fathers-day", name: "Father's Day", tagline: "For Papa", group: "life", tone: "grateful" },
  { slug: "congratulations", name: "Graduation & congrats", tagline: "You did it", group: "life", tone: "celebratory" },
  { slug: "farewell", name: "Farewell", tagline: "Not goodbye", group: "life", tone: "heartfelt" },
  { slug: "thank-you", name: "Thank you", tagline: "I noticed", group: "everyday", tone: "grateful" },
  { slug: "just-because", name: "Just because", tagline: "No reason at all", group: "everyday", tone: "heartfelt" },
  { slug: "diwali", name: "Diwali", tagline: "Light & sweets", group: "festival", tone: "celebratory" },
  { slug: "holi", name: "Holi", tagline: "All the colours", group: "festival", tone: "playful" },
  { slug: "raksha-bandhan", name: "Raksha Bandhan", tagline: "For my sibling", group: "festival", tone: "heartfelt" },
  { slug: "bhai-dooj", name: "Bhai Dooj", tagline: "Bond of love", group: "festival", tone: "heartfelt" },
  { slug: "christmas", name: "Christmas", tagline: "Warm wishes", group: "festival", tone: "celebratory" },
  { slug: "new-year", name: "New Year", tagline: "Fresh starts", group: "festival", tone: "celebratory" },
  { slug: "eid", name: "Eid", tagline: "Eid Mubarak", group: "festival", tone: "heartfelt" },
  { slug: "pongal-onam", name: "Pongal & Onam", tagline: "Harvest of joy", group: "festival", tone: "celebratory" },
];

export const STYLES = ["romantic", "minimalist", "funny", "elegant", "floral", "festive"] as const;
export type TemplateStyle = (typeof STYLES)[number];

export interface Template {
  slug: string;
  title: string;
  format: GiftFormat;
  style: TemplateStyle;
  occasions: string[]; // occasion slugs
  relationships: string[];
  premium: boolean;
  blurb: string;
  /** Card preview colours + sample text. */
  preview: { bg: string; ink: string; font: "hand" | "serif" | "sans"; sample: string };
  config: DeepPartial<GiftConfig>;
}

export const TEMPLATES: Template[] = [
  {
    slug: "rainy-day-letter",
    title: "Rainy-day letter",
    format: "letter",
    style: "romantic",
    occasions: ["love-letter", "anniversary", "just-because", "valentines-day"],
    relationships: ["partner", "spouse", "crush"],
    premium: false,
    blurb: "Handwritten on soft paper, sealed with a berry wax seal.",
    preview: { bg: "#fffdf9", ink: "#2b1624", font: "hand", sample: "Dear you," },
    config: { theme: { palette: "blush", font: "hand", decor: "flowers" }, letter: { paper: "handwritten", tone: "romantic" } },
  },
  {
    slug: "plain-and-honest",
    title: "Plain & honest",
    format: "letter",
    style: "minimalist",
    occasions: ["apology", "thank-you", "just-because", "farewell"],
    relationships: ["partner", "friend", "family", "colleague"],
    premium: false,
    blurb: "A clean, quiet note. Just your words, nothing in the way.",
    preview: { bg: "#ffffff", ink: "#2b1624", font: "sans", sample: "I'm sorry." },
    config: { theme: { palette: "cream", font: "sans", decor: "none" }, letter: { paper: "minimal", tone: "apologetic", flowers: false } },
  },
  {
    slug: "floral-stationery",
    title: "Floral stationery",
    format: "letter",
    style: "floral",
    occasions: ["mothers-day", "birthday", "wedding", "thank-you"],
    relationships: ["mother", "family", "friend"],
    premium: false,
    blurb: "Pressed-flower borders and a serif hand. Made for Maa.",
    preview: { bg: "#f8e2e8", ink: "#7e1838", font: "serif", sample: "For Maa" },
    config: { theme: { palette: "blush", font: "serif", decor: "flowers" }, letter: { paper: "floral", tone: "grateful" } },
  },
  {
    slug: "midnight-note",
    title: "Midnight note",
    format: "letter",
    style: "elegant",
    occasions: ["love-letter", "anniversary", "milestone"],
    relationships: ["partner", "spouse"],
    premium: true,
    blurb: "Ink-blue paper and gold lettering for the things you say at 2 a.m.",
    preview: { bg: "#231a33", ink: "#f6e7c8", font: "serif", sample: "Still you." },
    config: { theme: { palette: "night", font: "serif", decor: "none" }, letter: { paper: "night", tone: "romantic" }, reveal: "envelope" },
  },
  {
    slug: "rose-garden-bouquet",
    title: "Rose garden",
    format: "bouquet",
    style: "romantic",
    occasions: ["valentines-day", "anniversary", "love-letter", "apology"],
    relationships: ["partner", "spouse", "crush"],
    premium: false,
    blurb: "A dozen-ish roses with a silk wrap and a berry ribbon.",
    preview: { bg: "#a3214a", ink: "#fff7f9", font: "serif", sample: "For you" },
    config: { bouquet: { stems: { rose: 7, tulip: 0, sunflower: 0, lily: 0, daisy: 2, marigold: 0, lotus: 0 }, wrap: "silk", ribbon: "berry", backdrop: "blush" } },
  },
  {
    slug: "marigold-morning",
    title: "Marigold morning",
    format: "festival",
    style: "festive",
    occasions: ["diwali", "pongal-onam", "new-year", "bhai-dooj"],
    relationships: ["family", "friend", "sibling"],
    premium: false,
    blurb: "Marigolds, a little diya and confetti. Shubh Deepavali!",
    preview: { bg: "#d99a2b", ink: "#2b1624", font: "serif", sample: "Shubh Diwali" },
    config: {
      theme: { palette: "marigold", font: "serif", decor: "flowers" },
      stickers: ["diya", "sparkle"],
      greeting: { headline: "Happy Diwali, {name}!", message: "May this year be full of light, laughter and far too many sweets." },
      bouquet: { stems: { rose: 0, tulip: 0, sunflower: 2, lily: 0, daisy: 1, marigold: 6, lotus: 1 }, wrap: "kraft", ribbon: "marigold", backdrop: "cream" },
    },
  },
  {
    slug: "colour-splash",
    title: "Colour splash",
    format: "festival",
    style: "funny",
    occasions: ["holi"],
    relationships: ["friend", "best friend", "sibling", "family"],
    premium: false,
    blurb: "Bura na mano, Holi hai. Bright, silly and full of colour.",
    preview: { bg: "#4e7a61", ink: "#fff7f9", font: "hand", sample: "Bura na mano!" },
    config: {
      theme: { palette: "sage", font: "hand", decor: "hearts" },
      greeting: { headline: "Happy Holi, {name}!", message: "Consider this your official warning: I'm coming with gulaal." },
      bouquet: { stems: { rose: 2, tulip: 3, sunflower: 2, lily: 0, daisy: 2, marigold: 2, lotus: 0 }, wrap: "blush", ribbon: "sage", backdrop: "garden" },
    },
  },
  {
    slug: "rakhi-thread",
    title: "Rakhi thread",
    format: "combo",
    style: "festive",
    occasions: ["raksha-bandhan", "bhai-dooj"],
    relationships: ["sibling"],
    premium: false,
    blurb: "A letter, a little bouquet and your childhood photos.",
    preview: { bg: "#f2ccd7", ink: "#7e1838", font: "hand", sample: "To my bhai" },
    config: { stickers: ["rakhi", "heart"], letter: { tone: "heartfelt", paper: "floral" }, theme: { palette: "blush", font: "hand", decor: "flowers" } },
  },
  {
    slug: "open-when-box",
    title: "Open-when gift box",
    format: "giftbox",
    style: "romantic",
    occasions: ["birthday", "anniversary", "valentines-day", "just-because"],
    relationships: ["partner", "spouse", "best friend"],
    premium: true,
    blurb: "A box they tap open, with surprises inside, one after another.",
    preview: { bg: "#7e1838", ink: "#fff7f9", font: "serif", sample: "Tap to open" },
    config: { stickers: ["heart", "sparkle"], greeting: { headline: "Surprise, {name}!", message: "I packed a few things in here for you. Keep scrolling." } },
  },
  {
    slug: "hundred-reasons",
    title: "Reasons I adore you",
    format: "reasons",
    style: "romantic",
    occasions: ["anniversary", "valentines-day", "birthday", "just-because", "friendship-day"],
    relationships: ["partner", "best friend", "spouse"],
    premium: true,
    blurb: "Every reason gets its own little reveal.",
    preview: { bg: "#2f4f3d", ink: "#fff7f9", font: "hand", sample: "Reason #1: your laugh" },
    config: { theme: { palette: "sage", font: "hand", decor: "hearts" } },
  },
  {
    slug: "our-story",
    title: "Our story so far",
    format: "timeline",
    style: "elegant",
    occasions: ["anniversary", "milestone", "wedding", "farewell"],
    relationships: ["partner", "spouse", "best friend", "friend"],
    premium: true,
    blurb: "A memory timeline with dates, photos and a letter at the end.",
    preview: { bg: "#fffbf7", ink: "#2b1624", font: "serif", sample: "2019 → now" },
    config: { theme: { palette: "cream", font: "serif", decor: "none" } },
  },
  {
    slug: "birthday-countdown",
    title: "Birthday countdown",
    format: "countdown",
    style: "festive",
    occasions: ["birthday"],
    relationships: ["partner", "friend", "best friend", "sibling", "family"],
    premium: false,
    blurb: "Counts down to the big day, then bursts into confetti.",
    preview: { bg: "#fff7f9", ink: "#a3214a", font: "serif", sample: "3 days to go" },
    config: { stickers: ["cake", "balloon"], greeting: { headline: "Happy birthday, {name}!", message: "Another trip around the sun — and you made it look easy." } },
  },
  {
    slug: "best-friend-funny",
    title: "Certified best friend",
    format: "letter",
    style: "funny",
    occasions: ["friendship-day", "birthday", "thank-you"],
    relationships: ["friend", "best friend"],
    premium: false,
    blurb: "Playful paper, playful words. Roasts optional.",
    preview: { bg: "#fbe3c0", ink: "#2b1624", font: "hand", sample: "Official notice:" },
    config: { theme: { palette: "marigold", font: "hand", decor: "hearts" }, letter: { tone: "playful", paper: "handwritten" }, stickers: ["star", "heart"] },
  },
  {
    slug: "congrats-confetti",
    title: "Confetti congrats",
    format: "festival",
    style: "festive",
    occasions: ["congratulations", "new-year", "wedding", "christmas", "eid"],
    relationships: ["friend", "colleague", "family", "sibling"],
    premium: false,
    blurb: "A big, happy wish with a shower of confetti.",
    preview: { bg: "#f8e2e8", ink: "#2b1624", font: "serif", sample: "You did it!" },
    config: { greeting: { headline: "Congratulations, {name}!", message: "All that hard work, and look at you now. So proud of you." }, stickers: ["sparkle", "star"] },
  },
  {
    slug: "sunflower-thanks",
    title: "Sunflower thanks",
    format: "bouquet",
    style: "minimalist",
    occasions: ["thank-you", "fathers-day", "congratulations", "farewell"],
    relationships: ["father", "teacher", "colleague", "friend"],
    premium: false,
    blurb: "Bright sunflowers in kraft paper. Simple and sincere.",
    preview: { bg: "#f2c94c", ink: "#2b1624", font: "sans", sample: "Thank you" },
    config: { bouquet: { stems: { rose: 0, tulip: 0, sunflower: 5, lily: 0, daisy: 3, marigold: 0, lotus: 0 }, wrap: "kraft", ribbon: "sage", backdrop: "cream" } },
  },
];

export function getOccasion(slug: string | null | undefined) {
  return OCCASIONS.find((o) => o.slug === slug);
}
export function getTemplate(slug: string | null | undefined) {
  return TEMPLATES.find((t) => t.slug === slug);
}
export function templatesForOccasion(slug: string) {
  return TEMPLATES.filter((t) => t.occasions.includes(slug));
}

/** Build the starting config for a new gift from a format/template/occasion choice. */
export function buildStartingConfig(opts: { format?: GiftFormat; templateSlug?: string | null; occasion?: string | null }): GiftConfig {
  const template = getTemplate(opts.templateSlug);
  const format = opts.format ?? template?.format ?? "letter";
  let cfg = defaultConfig(format);
  const occasion = getOccasion(opts.occasion ?? template?.occasions[0]);
  if (occasion) {
    const starter = TONE_STARTERS[occasion.tone];
    cfg = mergeConfig(cfg, {
      occasion: occasion.slug,
      letter: { tone: occasion.tone, body: starter.lines[0], closing: starter.closing },
    });
  }
  if (template) {
    cfg = mergeConfig(cfg, { ...template.config, templateSlug: template.slug });
    const tone = template.config.letter?.tone;
    if (tone && !template.config.letter?.body) {
      cfg = mergeConfig(cfg, { letter: { body: TONE_STARTERS[tone].lines[0], closing: TONE_STARTERS[tone].closing } });
    }
  }
  return cfg;
}
