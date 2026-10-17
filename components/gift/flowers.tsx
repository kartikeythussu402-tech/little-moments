import type { FlowerKind } from "@/lib/gift";

/* Original, hand-built SVG flowers. Each is drawn centred on (0,0), ~48px wide. */

export const FLOWER_META: Record<FlowerKind, { label: string; swatch: string; size: number }> = {
  rose: { label: "Roses", swatch: "#b8314f", size: 1 },
  tulip: { label: "Tulips", swatch: "#e27a8f", size: 0.95 },
  sunflower: { label: "Sunflowers", swatch: "#f2b51e", size: 1.15 },
  lily: { label: "Lilies", swatch: "#f6dfe6", size: 1.1 },
  daisy: { label: "Daisies", swatch: "#ffffff", size: 0.85 },
  marigold: { label: "Marigolds", swatch: "#e98a15", size: 0.95 },
  lotus: { label: "Lotus", swatch: "#ec9fb6", size: 1.05 },
};

function petalsRing(count: number, rx: number, ry: number, dist: number, fill: string, stroke?: string, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = (360 / count) * i + offset;
    return <ellipse key={i} cx={0} cy={-dist} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.8 : 0} transform={`rotate(${a})`} />;
  });
}

export function Flower({ kind }: { kind: FlowerKind }) {
  switch (kind) {
    case "rose":
      return (
        <g>
          <circle r={23} fill="#a3214a" />
          <circle r={18} fill="#b8314f" />
          <path d="M-14 2 C-14 -12 2 -16 10 -8 C16 -2 10 10 0 10 C-8 10 -10 2 -4 -2" fill="none" stroke="#7e1838" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M-6 0 C-5 -7 4 -8 6 -2 C7 3 1 5 -1 2" fill="none" stroke="#7e1838" strokeWidth={2} strokeLinecap="round" />
          <path d="M-20 8 C-16 18 -4 23 8 21" fill="none" stroke="#c9566f" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case "tulip":
      return (
        <g>
          <path d="M-18 -2 C-20 -20 -8 -26 -4 -20 C-2 -26 2 -26 4 -20 C8 -26 20 -20 18 -2 C16 14 -16 14 -18 -2Z" fill="#e27a8f" />
          <path d="M-4 -20 C-6 -6 -4 8 0 12 C4 8 6 -6 4 -20" fill="#c9566f" />
          <path d="M-18 -2 C-12 4 -6 8 0 12" fill="none" stroke="#b8475f" strokeWidth={1.2} />
        </g>
      );
    case "sunflower":
      return (
        <g>
          {petalsRing(16, 5.5, 12, 18, "#f2b51e", "#d9930f")}
          {petalsRing(16, 4.5, 9, 15, "#f7c948", undefined, 11)}
          <circle r={12} fill="#5a3b12" />
          <circle r={8} fill="#3e2709" />
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} r={1} fill="#8a5a10" cx={Math.cos(i * 0.63) * 6} cy={Math.sin(i * 0.63) * 6} />
          ))}
        </g>
      );
    case "lily":
      return (
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d="M0 0 C-7 -10 -5 -24 0 -28 C5 -24 7 -10 0 0Z" fill="#fbeef2" stroke="#e7a9bb" strokeWidth={1} transform={`rotate(${i * 60})`} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <path key={`v${i}`} d="M0 -4 L0 -18" stroke="#e7a9bb" strokeWidth={1.4} transform={`rotate(${i * 60})`} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <g key={`s${i}`} transform={`rotate(${i * 72 + 20})`}>
              <line y2={-12} stroke="#6f8f52" strokeWidth={1} />
              <ellipse cy={-13} rx={1.6} ry={2.6} fill="#a3214a" />
            </g>
          ))}
        </g>
      );
    case "daisy":
      return (
        <g>
          {petalsRing(14, 4, 12, 13, "#ffffff", "#ecd5dc")}
          <circle r={8} fill="#f2b51e" />
          <circle r={5} fill="#e99a12" opacity={0.6} />
        </g>
      );
    case "marigold":
      return (
        <g>
          {petalsRing(14, 7, 9, 15, "#d9700f")}
          {petalsRing(12, 6.5, 8, 10, "#e98a15", undefined, 15)}
          {petalsRing(9, 5.5, 6.5, 5.5, "#f4a52a", undefined, 5)}
          <circle r={4} fill="#f7c948" />
        </g>
      );
    case "lotus":
      return (
        <g>
          <path d="M0 10 C-26 6 -30 -6 -24 -12 C-14 -6 -6 0 0 10Z" fill="#f2b6c6" />
          <path d="M0 10 C26 6 30 -6 24 -12 C14 -6 6 0 0 10Z" fill="#f2b6c6" />
          <path d="M0 10 C-18 2 -18 -14 -10 -22 C-4 -12 -2 0 0 10Z" fill="#ec9fb6" />
          <path d="M0 10 C18 2 18 -14 10 -22 C4 -12 2 0 0 10Z" fill="#ec9fb6" />
          <path d="M0 10 C-8 -2 -6 -20 0 -28 C6 -20 8 -2 0 10Z" fill="#e27a9a" />
        </g>
      );
  }
}

/** Small swatch icon for controls. */
export function FlowerIcon({ kind, size = 28 }: { kind: FlowerKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-32 -32 64 64" aria-hidden="true">
      <Flower kind={kind} />
    </svg>
  );
}
