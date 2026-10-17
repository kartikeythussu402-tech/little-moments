import type { GiftConfig } from "./gift";

export interface Palette {
  bg: string;
  surface: string;
  ink: string;
  soft: string;
  accent: string;
  dark: boolean;
}

/** Recipient-page palettes. All text/background pairs meet WCAG AA. */
export const PALETTE: Record<GiftConfig["theme"]["palette"], Palette> = {
  blush: { bg: "#fcf0f3", surface: "#fffdf9", ink: "#2b1624", soft: "#66485a", accent: "#a3214a", dark: false },
  cream: { bg: "#fbf6ee", surface: "#ffffff", ink: "#2b1624", soft: "#5f5049", accent: "#8a3a1f", dark: false },
  night: { bg: "#1f1830", surface: "#2b2240", ink: "#fbeef2", soft: "#d9c8d6", accent: "#f2b6c6", dark: true },
  marigold: { bg: "#fcefd6", surface: "#fffaf0", ink: "#2b1624", soft: "#5e4632", accent: "#8a5a10", dark: false },
  sage: { bg: "#e9f1eb", surface: "#fbfdfb", ink: "#1e2c24", soft: "#46594d", accent: "#2f4f3d", dark: false },
};

export const FONT_CLASS: Record<GiftConfig["theme"]["font"], string> = {
  hand: "hand",
  serif: "display",
  sans: "",
};

export const PAPER: Record<GiftConfig["letter"]["paper"], { bg: string; ink: string; soft: string; border: string; font: string; label: string }> = {
  handwritten: { bg: "#fffdf9", ink: "#2b1624", soft: "#3e2a36", border: "#efe3dc", font: "hand", label: "Handwritten" },
  stationery: { bg: "#fffcf6", ink: "#2b1624", soft: "#4a3540", border: "#e8dccb", font: "display", label: "Stationery" },
  floral: { bg: "#fbe9ee", ink: "#5e1530", soft: "#6b2a42", border: "#efc7d3", font: "display", label: "Floral" },
  minimal: { bg: "#ffffff", ink: "#1f1a1d", soft: "#3a3337", border: "#e8e4e6", font: "", label: "Minimal" },
  night: { bg: "#231a33", ink: "#f6e7c8", soft: "#eadbc0", border: "#3b2f50", font: "display", label: "Night ink" },
};
