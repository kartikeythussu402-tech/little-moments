import { personalise, type GiftConfig } from "@/lib/gift";
import { PAPER } from "@/lib/theme";

const SIZE = {
  hand: { sm: "text-[20px]", md: "text-[23px]", lg: "text-[27px]" },
  other: { sm: "text-[15px]", md: "text-[17px]", lg: "text-[19px]" },
};
const LEADING = { snug: "leading-snug", relaxed: "leading-relaxed", airy: "leading-loose" };
const GAP = { snug: "gap-3", relaxed: "gap-4", airy: "gap-6" };

function CornerSprig({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <path d="M6 74 C20 50 34 34 60 16" stroke="#6f9a7f" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="26" cy="50" rx="9" ry="4" fill="#9cbfa6" transform="rotate(-40 26 50)" />
      <ellipse cx="40" cy="36" rx="8" ry="3.5" fill="#9cbfa6" transform="rotate(-45 40 36)" />
      <circle cx="62" cy="14" r="7" fill="#e7a9bb" />
      <circle cx="62" cy="14" r="3" fill="#c9566f" />
      <circle cx="16" cy="62" r="5" fill="#f2ccd7" />
    </svg>
  );
}

export function Letter({ config, className = "" }: { config: GiftConfig; className?: string }) {
  const l = config.letter;
  const paper = PAPER[l.paper];
  const isHand = paper.font === "hand";
  const size = (isHand ? SIZE.hand : SIZE.other)[l.fontSize];
  const paragraphs = personalise(l.body, config)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article
      className={`relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-md px-6 py-8 sm:px-10 sm:py-11 ${className}`}
      style={{
        background: paper.bg,
        color: paper.ink,
        border: `1px solid ${paper.border}`,
        boxShadow: "var(--shadow-paper)",
        backgroundImage:
          l.paper === "stationery"
            ? "repeating-linear-gradient(to bottom, transparent 0 31px, rgb(163 33 74 / 0.08) 31px 32px)"
            : undefined,
      }}
    >
      {l.flowers && (
        <>
          <CornerSprig className="pointer-events-none absolute -right-1 -top-1 h-16 w-16 rotate-90 opacity-90 sm:h-20 sm:w-20" />
          <CornerSprig className="pointer-events-none absolute -bottom-1 -left-1 h-16 w-16 opacity-90 sm:h-20 sm:w-20" />
        </>
      )}
      {l.paper === "floral" && <div className="pointer-events-none absolute inset-3 rounded border border-dashed" style={{ borderColor: paper.border }} aria-hidden="true" />}
      <div className={`relative flex flex-col ${GAP[l.spacing]} ${paper.font} ${size} ${LEADING[l.spacing]}`}>
        {l.title && <h2 className={`${isHand ? "text-[1.35em]" : "display text-[1.3em]"} leading-tight`}>{personalise(l.title, config)}</h2>}
        {l.greeting && <p className={isHand ? "text-[1.18em]" : "font-semibold"}>{personalise(l.greeting, config)}</p>}
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line" style={{ color: paper.soft }}>
            {p}
          </p>
        ))}
        {(l.closing || l.signature || config.senderName) && (
          <p className="mt-2 self-end text-right">
            {l.closing && <span className="block" style={{ color: paper.soft }}>{personalise(l.closing, config)},</span>}
            {(l.signature || config.senderName) && <span className={`block ${isHand ? "text-[1.15em]" : "font-semibold"}`}>{l.signature || config.senderName}</span>}
          </p>
        )}
      </div>
    </article>
  );
}
