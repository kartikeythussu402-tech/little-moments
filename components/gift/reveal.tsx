"use client";
import { useState } from "react";
import type { Palette } from "@/lib/theme";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EnvelopeReveal({ name, palette, onOpen }: { name: string; palette: Palette; onOpen: () => void }) {
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(onOpen, prefersReducedMotion() ? 0 : 1300);
  };
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="animate-rise">
        <p className="hand text-3xl" style={{ color: palette.accent }}>
          {name ? `${name},` : "Hello,"}
        </p>
        <h1 className="display mt-2 text-3xl leading-tight sm:text-4xl" style={{ color: palette.ink }}>
          someone made you
          <br />
          something.
        </h1>
      </div>
      <button
        type="button"
        onClick={open}
        aria-label="Open your letter"
        className="group relative h-[200px] w-[290px] cursor-pointer rounded-xl [perspective:900px] focus-visible:outline-offset-8"
      >
        {/* letter peeking out */}
        <div
          className="absolute inset-x-5 top-4 h-[170px] rounded-md bg-[#fffdf9] shadow-md"
          style={{ animation: opening ? "letter-out 0.9s 0.45s cubic-bezier(.2,.7,.2,1) forwards" : undefined }}
          aria-hidden="true"
        >
          <div className="mx-6 mt-6 space-y-2.5">
            <div className="h-2 w-2/3 rounded bg-[#ecd5dc]" />
            <div className="h-2 w-full rounded bg-[#f2e4e8]" />
            <div className="h-2 w-5/6 rounded bg-[#f2e4e8]" />
          </div>
        </div>
        {/* envelope body */}
        <svg viewBox="0 0 290 200" className="absolute inset-0 h-full w-full drop-shadow-[0_18px_30px_rgba(43,22,36,0.25)]" aria-hidden="true">
          <path d="M0 40 L145 130 L290 40 V188 a12 12 0 0 1-12 12 H12 a12 12 0 0 1-12-12Z" fill="#f8e2e8" />
          <path d="M0 200 L120 112 M290 200 L170 112" stroke="#ecc4cf" strokeWidth="2" />
        </svg>
        {/* flap */}
        <div
          className="absolute inset-x-0 top-0 h-[130px] origin-top"
          style={{ transformStyle: "preserve-3d", animation: opening ? "flap-open 0.6s ease-in forwards" : undefined }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 290 130" className="h-full w-full">
            <path d="M0 12 a12 12 0 0 1 12-12 H278 a12 12 0 0 1 12 12 L145 130Z" fill="#f2ccd7" />
          </svg>
        </div>
        {/* wax seal */}
        <span
          className="absolute left-1/2 top-[104px] grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full shadow-md transition-transform group-hover:scale-105"
          style={{ background: "#a3214a", opacity: opening ? 0 : 1, transition: "opacity .25s" }}
          aria-hidden="true"
        >
          <svg width="26" height="26" viewBox="0 0 48 48">
            <path d="M24 39 C12 30 8 23 8 17 C8 12 12 9 16.5 9 C19.8 9 22.6 11 24 13.6 C25.4 11 28.2 9 31.5 9 C36 9 40 12 40 17 C40 23 36 30 24 39Z" fill="#7e1838" stroke="#f2ccd7" strokeWidth="2" />
          </svg>
        </span>
      </button>
      <p className="text-sm font-medium" style={{ color: palette.soft }}>
        {opening ? "Opening…" : "Tap the seal to open"}
      </p>
    </div>
  );
}

export function GiftBoxReveal({ name, palette, onOpen }: { name: string; palette: Palette; onOpen: () => void }) {
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(onOpen, prefersReducedMotion() ? 0 : 1000);
  };
  return (
    <div className="flex min-h-[80svh] flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="animate-rise">
        <p className="hand text-3xl" style={{ color: palette.accent }}>
          {name ? `For ${name}` : "For you"}
        </p>
        <h1 className="display mt-2 text-3xl sm:text-4xl" style={{ color: palette.ink }}>
          A little surprise is waiting
        </h1>
      </div>
      <button
        type="button"
        onClick={open}
        aria-label="Open your gift box"
        className="relative h-[220px] w-[220px] cursor-pointer"
        style={{ animation: opening ? undefined : "wiggle 2.8s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 220 220" className="h-full w-full drop-shadow-[0_18px_30px_rgba(43,22,36,0.25)]" aria-hidden="true">
          <rect x="30" y="92" width="160" height="118" rx="10" fill="#a3214a" />
          <rect x="98" y="92" width="24" height="118" fill="#d99a2b" />
          <rect x="30" y="92" width="160" height="14" fill="#7e1838" opacity="0.35" />
        </svg>
        <svg
          viewBox="0 0 220 110"
          className="absolute inset-x-0 top-0 h-[110px] w-full"
          style={{ animation: opening ? "lid-off 0.9s cubic-bezier(.3,.6,.3,1) forwards" : undefined }}
          aria-hidden="true"
        >
          <path d="M110 70 C80 30 60 40 70 62 C76 74 96 74 110 70Z" fill="#d99a2b" />
          <path d="M110 70 C140 30 160 40 150 62 C144 74 124 74 110 70Z" fill="#d99a2b" />
          <rect x="20" y="66" width="180" height="34" rx="8" fill="#c9566f" />
          <rect x="98" y="66" width="24" height="34" fill="#d99a2b" />
        </svg>
      </button>
      <p className="text-sm font-medium" style={{ color: palette.soft }}>
        {opening ? "Opening…" : "Tap the box to open"}
      </p>
    </div>
  );
}
