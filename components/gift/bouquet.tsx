import { FLOWER_KINDS, type BouquetConfig, type FlowerKind } from "@/lib/gift";
import { Flower, FLOWER_META } from "./flowers";

const TIE = { x: 160, y: 288 };

// Slots arranged as a dome, listed centre-first so small bouquets look full.
const SLOTS: Array<[number, number]> = [
  [160, 150],
  [116, 168],
  [204, 168],
  [138, 112],
  [182, 112],
  [160, 196],
  [90, 208],
  [230, 208],
  [124, 222],
  [196, 222],
  [80, 150],
  [240, 150],
];

const WRAP: Record<BouquetConfig["wrap"], { front: string; back: string; line: string }> = {
  kraft: { front: "#c9a77a", back: "#b38f60", line: "#a07c4e" },
  silk: { front: "#f7eef5", back: "#e6d5e2", line: "#d4c0cf" },
  blush: { front: "#f2ccd7", back: "#e7a9bb", line: "#d98ea4" },
  ink: { front: "#2f2540", back: "#231a33", line: "#463a5c" },
};
const RIBBON: Record<BouquetConfig["ribbon"], string> = { berry: "#a3214a", marigold: "#d99a2b", cream: "#fffbf7", sage: "#4e7a61" };
const BACKDROP: Record<BouquetConfig["backdrop"], string> = { blush: "#f8e2e8", cream: "#fffaf3", night: "#231a33", garden: "#e3eee6" };

export function expandStems(stems: Partial<Record<FlowerKind, number>>): FlowerKind[] {
  // Interleave kinds so mixed bouquets look natural, big flowers first.
  const order: FlowerKind[] = ["sunflower", "lily", "rose", "lotus", "tulip", "marigold", "daisy"];
  const queues = order.map((k) => Array.from({ length: Math.max(0, stems[k] ?? 0) }, () => k));
  const out: FlowerKind[] = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out.slice(0, SLOTS.length);
}

export function Bouquet({
  bouquet,
  animate = true,
  className,
  label,
  bare = false,
}: {
  bouquet: BouquetConfig;
  animate?: boolean;
  className?: string;
  label?: string;
  /** Skip the backdrop card (for layering over other artwork). */
  bare?: boolean;
}) {
  const flowers = expandStems(bouquet.stems);
  const placed = flowers.map((kind, i) => ({ kind, x: SLOTS[i][0], y: SLOTS[i][1], i }));
  const wrap = WRAP[bouquet.wrap];
  const ribbon = RIBBON[bouquet.ribbon];
  const summary =
    label ??
    (flowers.length
      ? `A bouquet of ${FLOWER_KINDS.filter((k) => (bouquet.stems[k] ?? 0) > 0)
          .map((k) => `${bouquet.stems[k]} ${FLOWER_META[k].label.toLowerCase()}`)
          .join(", ")}`
      : "An empty bouquet wrap");

  return (
    <svg viewBox="0 0 320 400" className={className} role="img" aria-label={summary}>
      {!bare && <rect width="320" height="400" rx="28" fill={BACKDROP[bouquet.backdrop]} />}
      {!bare && bouquet.backdrop === "garden" && (
        <g opacity={0.5} aria-hidden="true">
          <circle cx="40" cy="60" r="34" fill="#cfe1d4" />
          <circle cx="285" cy="90" r="46" fill="#cfe1d4" />
          <circle cx="270" cy="350" r="40" fill="#d7e8db" />
        </g>
      )}
      {!bare && bouquet.backdrop === "night" && (
        <g fill="#fff7f9" opacity={0.6} aria-hidden="true">
          <circle cx="40" cy="50" r="1.4" />
          <circle cx="280" cy="40" r="1.2" />
          <circle cx="250" cy="120" r="1" />
          <circle cx="60" cy="140" r="1" />
          <circle cx="160" cy="30" r="1.3" />
        </g>
      )}

      {/* back of the wrap */}
      <path d="M92 240 L160 60 L228 240 Z" fill={wrap.back} opacity={flowers.length ? 0.9 : 0.6} />

      {/* stems */}
      <g stroke="#4e7a61" strokeWidth={3} strokeLinecap="round" fill="none">
        {placed.map((p) => (
          <path key={`s${p.i}`} d={`M${p.x} ${p.y} Q ${(p.x + TIE.x) / 2} ${(p.y + TIE.y) / 2 + 12} ${TIE.x} ${TIE.y}`} />
        ))}
      </g>
      {/* leaves */}
      {flowers.length > 0 && (
        <g fill="#4e7a61">
          <ellipse cx="112" cy="236" rx="22" ry="8" transform="rotate(-35 112 236)" />
          <ellipse cx="208" cy="236" rx="22" ry="8" transform="rotate(35 208 236)" />
          <ellipse cx="96" cy="196" rx="16" ry="6" fill="#6f9a7f" transform="rotate(-55 96 196)" />
          <ellipse cx="224" cy="196" rx="16" ry="6" fill="#6f9a7f" transform="rotate(55 224 196)" />
        </g>
      )}

      {/* flowers, back row first */}
      {[...placed]
        .sort((a, b) => a.y - b.y)
        .map((p) => (
          <g key={`f${p.i}`} transform={`translate(${p.x} ${p.y}) scale(${FLOWER_META[p.kind].size})`}>
            <g
              className={animate ? "animate-bloom" : undefined}
              style={animate ? { animationDelay: `${120 + p.i * 90}ms`, transformBox: "fill-box", transformOrigin: "center" } : undefined}
            >
              <Flower kind={p.kind} />
            </g>
          </g>
        ))}

      {/* front of the wrap */}
      <path d="M86 236 L234 236 L192 386 L128 386 Z" fill={wrap.front} />
      <path d="M86 236 L160 300 L234 236" fill="none" stroke={wrap.line} strokeWidth={1.5} />
      <path d="M128 386 L150 300 M192 386 L170 300" stroke={wrap.line} strokeWidth={1.2} />

      {/* ribbon bow */}
      <g fill={ribbon} stroke={bouquet.ribbon === "cream" ? "#d4c0cf" : "none"} strokeWidth={1}>
        <path d="M160 292 C138 272 120 282 128 300 C134 312 150 302 160 292Z" />
        <path d="M160 292 C182 272 200 282 192 300 C186 312 170 302 160 292Z" />
        <path d="M156 296 L144 336 L152 334 L160 300 L168 334 L176 336 L164 296Z" />
        <circle cx="160" cy="294" r="6" />
      </g>

      {!flowers.length && (
        <text x="160" y="160" textAnchor="middle" fontSize="15" fill={bouquet.backdrop === "night" ? "#f8e2e8" : "#66485a"} fontFamily="var(--font-sans)">
          Add some flowers
        </text>
      )}
    </svg>
  );
}
