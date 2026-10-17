import Link from "next/link";

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="3" y="9" width="34" height="24" rx="5" fill="#2b1624" />
      <path d="M4 12 L20 24 L36 12" stroke="#fcf0f3" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
      <circle cx="20" cy="24" r="7" fill="#a3214a" stroke="#fcf0f3" strokeWidth="1.6" />
      <path d="M20 28 C16.5 25.6 15.5 23.8 15.5 22.4 C15.5 21.2 16.5 20.3 17.6 20.3 C18.6 20.3 19.5 20.9 20 21.7 C20.5 20.9 21.4 20.3 22.4 20.3 C23.5 20.3 24.5 21.2 24.5 22.4 C24.5 23.8 23.5 25.6 20 28Z" fill="#f2ccd7" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-lg text-ink" aria-label="Little Moments — home">
      <LogoMark />
      {!compact && <span className="display text-[21px] leading-none">Little Moments</span>}
    </Link>
  );
}
