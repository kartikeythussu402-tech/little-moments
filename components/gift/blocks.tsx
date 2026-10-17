"use client";
import { useEffect, useState } from "react";
import { personalise, type GiftConfig } from "@/lib/gift";
import type { Palette } from "@/lib/theme";
import { Sticker } from "./stickers";

export function GreetingBlock({ config, palette, fontClass }: { config: GiftConfig; palette: Palette; fontClass: string }) {
  return (
    <section className="flex flex-col items-center gap-4 text-center">
      {config.stickers.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3" aria-hidden="true">
          {config.stickers.map((s, i) => (
            <span key={`${s}${i}`} className="animate-[wiggle_2.4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 300}ms` }}>
              <Sticker kind={s} size={44} />
            </span>
          ))}
        </div>
      )}
      {config.greeting.headline && (
        <h2 className={`${fontClass === "hand" ? "hand text-5xl" : "display text-4xl"} leading-tight sm:text-5xl`} style={{ color: palette.ink }}>
          {personalise(config.greeting.headline, config)}
        </h2>
      )}
      {config.greeting.message && (
        <p className="max-w-md text-lg leading-relaxed" style={{ color: palette.soft }}>
          {personalise(config.greeting.message, config)}
        </p>
      )}
    </section>
  );
}

export function PhotosBlock({ config, urls, palette }: { config: GiftConfig; urls: Record<string, string>; palette: Palette }) {
  const items = config.photos.items.filter((p) => urls[p.ref]);
  if (!items.length) return null;
  return (
    <section aria-label="Photos" className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4">
      {items.map((p, i) => (
        <figure
          key={p.id}
          className={`${items.length === 1 || (items.length === 3 && i === 0) ? "col-span-2" : ""} rounded-lg p-2 pb-3 shadow-[var(--shadow-paper)]`}
          style={{ background: palette.surface, transform: `rotate(${[-1.5, 1.2, -0.8, 1.6][i % 4]}deg)` }}
        >
          {/* Signed, short-lived URLs from private storage — plain <img> avoids proxying private data. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[p.ref]} alt={p.caption || `Photo ${i + 1}`} className="aspect-[4/3] w-full rounded object-cover" loading="lazy" />
          {p.caption && (
            <figcaption className="hand mt-2 text-center text-xl" style={{ color: palette.ink }}>
              {p.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </section>
  );
}

export function ReasonsBlock({ config, palette, interactive }: { config: GiftConfig; palette: Palette; interactive: boolean }) {
  const items = config.reasons.items.filter((r) => r.trim());
  const [shown, setShown] = useState(interactive ? 1 : items.length);
  if (!items.length) return null;
  const visible = Math.min(shown, items.length);
  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <h2 className="display text-3xl" style={{ color: palette.ink }}>
        {personalise(config.reasons.title, config)}
      </h2>
      <ol className="flex w-full flex-col gap-3">
        {items.slice(0, visible).map((r, i) => (
          <li key={i} className="animate-rise rounded-2xl px-5 py-4 shadow-[var(--shadow-soft)]" style={{ background: palette.surface, color: palette.ink }}>
            <span className="mb-1 block text-xs font-bold uppercase tracking-widest" style={{ color: palette.accent }}>
              Reason {i + 1}
            </span>
            <span className="hand text-2xl leading-snug">{personalise(r, config)}</span>
          </li>
        ))}
      </ol>
      {visible < items.length && (
        <button type="button" onClick={() => setShown((n) => n + 1)} className="btn" style={{ background: palette.accent, color: palette.dark ? "#1f1830" : "#fff" }}>
          Reveal reason {visible + 1} of {items.length}
        </button>
      )}
    </section>
  );
}

export function TimelineBlock({ config, palette }: { config: GiftConfig; palette: Palette }) {
  const items = config.timeline.items.filter((t) => t.title.trim() || t.text.trim());
  if (!items.length) return null;
  return (
    <section className="mx-auto w-full max-w-md">
      <h2 className="display mb-6 text-center text-3xl" style={{ color: palette.ink }}>
        {personalise(config.timeline.title, config)}
      </h2>
      <ol className="relative ml-3 border-l-2 pl-6" style={{ borderColor: palette.accent }}>
        {items.map((t, i) => (
          <li key={i} className="relative mb-7 last:mb-0">
            <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4" style={{ background: palette.surface, borderColor: palette.accent }} aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: palette.accent }}>
              {t.date}
            </p>
            <h3 className="mt-1 text-lg font-semibold" style={{ color: palette.ink }}>
              {personalise(t.title, config)}
            </h3>
            {t.text && (
              <p className="mt-1 leading-relaxed" style={{ color: palette.soft }}>
                {personalise(t.text, config)}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function remaining(target: string) {
  const t = Date.parse(target);
  if (!target || Number.isNaN(t)) return null;
  const ms = t - Date.now();
  if (ms <= 0) return { done: true, d: 0, h: 0, m: 0, s: 0 };
  return { done: false, d: Math.floor(ms / 864e5), h: Math.floor((ms / 36e5) % 24), m: Math.floor((ms / 6e4) % 60), s: Math.floor((ms / 1e3) % 60) };
}

export function CountdownBlock({ config, palette }: { config: GiftConfig; palette: Palette }) {
  const [now, setNow] = useState<ReturnType<typeof remaining>>(null);
  useEffect(() => {
    const tick = () => setNow(remaining(config.countdown.target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [config.countdown.target]);
  if (!config.countdown.target) return null;
  if (!now) return <div className="h-28" aria-hidden="true" />;
  return (
    <section className="flex flex-col items-center gap-4 text-center" aria-live="polite">
      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: palette.accent }}>
        {now.done ? "The day is here" : personalise(config.countdown.label, config)}
      </p>
      {!now.done && (
        <div className="flex gap-2 sm:gap-3">
          {(
            [
              ["days", now.d],
              ["hours", now.h],
              ["mins", now.m],
              ["secs", now.s],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="flex w-[4.5rem] flex-col items-center rounded-2xl py-3 shadow-[var(--shadow-soft)]" style={{ background: palette.surface }}>
              <span className="display text-3xl tabular-nums" style={{ color: palette.ink }}>
                {String(v).padStart(2, "0")}
              </span>
              <span className="text-xs font-semibold" style={{ color: palette.soft }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function useCountdownLocked(config: GiftConfig) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!config.blocks.includes("countdown") || !config.countdown.target) return;
    const check = () => {
      const r = remaining(config.countdown.target);
      setLocked(Boolean(r && !r.done));
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [config.blocks, config.countdown.target]);
  return locked;
}

export function Confetti({ run }: { run: boolean }) {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; dur: number; color: string; drift: number }>>([]);
  useEffect(() => {
    if (!run) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#a3214a", "#d99a2b", "#f2ccd7", "#4e7a61", "#c9566f", "#f2b51e"];
    const next = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      dur: 2.6 + Math.random() * 2,
      color: colors[i % colors.length],
      drift: (Math.random() - 0.5) * 160,
    }));
    const start = setTimeout(() => setPieces(next), 0);
    const clear = setTimeout(() => setPieces([]), 5200);
    return () => {
      clearTimeout(start);
      clearTimeout(clear);
    };
  }, [run]);
  return (
    <div aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, ["--drift" as string]: `${p.drift}px` }}
        />
      ))}
    </div>
  );
}
