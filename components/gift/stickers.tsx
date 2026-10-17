import type { GiftConfig } from "@/lib/gift";

type StickerKind = GiftConfig["stickers"][number];

export const STICKER_LABELS: Record<StickerKind, string> = {
  heart: "Heart",
  sparkle: "Sparkle",
  diya: "Diya",
  cake: "Cake",
  star: "Star",
  envelope: "Love letter",
  rakhi: "Rakhi",
  balloon: "Balloon",
};

/** Original line-and-fill sticker illustrations (24×24 grid). */
export function Sticker({ kind, size = 40, className }: { kind: StickerKind; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 48 48", className, "aria-hidden": true as const };
  switch (kind) {
    case "heart":
      return (
        <svg {...common}>
          <path d="M24 41 C10 31 5 23 5 16 C5 10 10 6 15.5 6 C19.5 6 22.5 8.5 24 11.5 C25.5 8.5 28.5 6 32.5 6 C38 6 43 10 43 16 C43 23 38 31 24 41Z" fill="#c9566f" />
          <path d="M13 13 C11 15 11 18 12 20" stroke="#fff7f9" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M24 4 C25.5 16 32 22.5 44 24 C32 25.5 25.5 32 24 44 C22.5 32 16 25.5 4 24 C16 22.5 22.5 16 24 4Z" fill="#d99a2b" />
          <circle cx="38" cy="10" r="3" fill="#f2b51e" />
        </svg>
      );
    case "diya":
      return (
        <svg {...common}>
          <path d="M24 6 C29 13 29 19 24 22 C19 19 19 13 24 6Z" fill="#f2b51e" />
          <path d="M24 12 C26 15 26 18 24 20 C22 18 22 15 24 12Z" fill="#e98a15" />
          <path d="M5 26 C8 38 40 38 43 26 Z" fill="#b8475f" />
          <path d="M5 26 L43 26" stroke="#7e1838" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="31" r="1.8" fill="#f7c948" />
          <circle cx="24" cy="33" r="1.8" fill="#f7c948" />
          <circle cx="32" cy="31" r="1.8" fill="#f7c948" />
        </svg>
      );
    case "cake":
      return (
        <svg {...common}>
          <rect x="8" y="24" width="32" height="16" rx="3" fill="#f2ccd7" />
          <path d="M8 29 C12 33 16 25 20 29 C24 33 28 25 32 29 C36 33 40 27 40 27 V24 H8Z" fill="#fff7f9" />
          <rect x="22" y="12" width="4" height="12" rx="1.5" fill="#a3214a" />
          <path d="M24 4 C26.5 7.5 26.5 10 24 11.5 C21.5 10 21.5 7.5 24 4Z" fill="#d99a2b" />
          <rect x="6" y="40" width="36" height="3" rx="1.5" fill="#c9a77a" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M24 5 L29.5 17.5 L43 18.8 L32.8 27.8 L35.9 41 L24 34 L12.1 41 L15.2 27.8 L5 18.8 L18.5 17.5Z" fill="#f2b51e" stroke="#d9930f" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "envelope":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="38" height="27" rx="3" fill="#fffbf7" stroke="#c9566f" strokeWidth="2" />
          <path d="M6 13 L24 27 L42 13" fill="none" stroke="#c9566f" strokeWidth="2" />
          <circle cx="24" cy="27" r="5" fill="#a3214a" />
        </svg>
      );
    case "rakhi":
      return (
        <svg {...common}>
          <path d="M2 24 H46" stroke="#d99a2b" strokeWidth="3" strokeLinecap="round" />
          {Array.from({ length: 10 }, (_, i) => (
            <ellipse key={i} cx="24" cy="15" rx="3.5" ry="8" fill={i % 2 ? "#e98a15" : "#c9566f"} transform={`rotate(${i * 36} 24 24)`} />
          ))}
          <circle cx="24" cy="24" r="6" fill="#a3214a" />
          <circle cx="24" cy="24" r="2.5" fill="#f7c948" />
        </svg>
      );
    case "balloon":
      return (
        <svg {...common}>
          <ellipse cx="24" cy="18" rx="12" ry="14" fill="#c9566f" />
          <path d="M22 31 L26 31 L24 34Z" fill="#a3214a" />
          <path d="M24 34 C20 38 28 41 24 46" stroke="#66485a" strokeWidth="1.5" fill="none" />
          <path d="M18 12 C17 15 17 18 18 20" stroke="#fff7f9" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );
  }
}
