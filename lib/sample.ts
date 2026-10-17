import { buildStartingConfig } from "./catalog";
import { mergeConfig, type GiftConfig } from "./gift";

/** Fictional sample gift used on the homepage and /example. No real people. */
export const SAMPLE_GIFT: GiftConfig = mergeConfig(buildStartingConfig({ format: "combo", templateSlug: "rainy-day-letter", occasion: "anniversary" }), {
  format: "combo",
  blocks: ["letter", "bouquet", "reasons"],
  recipientName: "Ananya",
  senderName: "R.",
  reveal: "envelope",
  letter: {
    title: "",
    greeting: "Dear {name},",
    body: "Five years since that rainy auto ride to Lodhi Garden. I still save you the window seat, and I still mean every bit of it.\n\nThank you for the chai at 2 a.m., the terrible puns, and for making ordinary Tuesdays feel like something worth remembering.",
    closing: "Yours, always",
    signature: "R.",
    paper: "handwritten",
    tone: "romantic",
  },
  bouquet: {
    stems: { rose: 4, tulip: 1, sunflower: 0, lily: 1, daisy: 2, marigold: 2, lotus: 0 },
    wrap: "kraft",
    ribbon: "berry",
    backdrop: "blush",
    card: "For the next fifty monsoons.",
  },
  reasons: {
    title: "A few reasons, out of many",
    items: ["You laugh before the joke ends.", "You remember how I take my chai.", "You make every plan feel like an adventure."],
  },
});
