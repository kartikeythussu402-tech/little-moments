"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { BlockKind, GiftConfig } from "@/lib/gift";
import { FONT_CLASS, PALETTE } from "@/lib/theme";
import { Bouquet } from "./bouquet";
import { Confetti, CountdownBlock, GreetingBlock, PhotosBlock, ReasonsBlock, TimelineBlock, useCountdownLocked } from "./blocks";
import { Letter } from "./letter";
import { EnvelopeReveal, GiftBoxReveal } from "./reveal";

function Decor({ kind, dark }: { kind: GiftConfig["theme"]["decor"]; dark: boolean }) {
  if (kind === "none") return null;
  const fill = dark ? "rgb(242 182 198 / 0.12)" : "rgb(201 86 111 / 0.10)";
  const spots = [
    [6, 8, 1],
    [88, 12, 0.8],
    [12, 52, 0.7],
    [92, 60, 1.1],
    [8, 88, 0.9],
    [80, 92, 0.7],
  ];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {spots.map(([x, y, s], i) => (
        <svg key={i} viewBox="0 0 48 48" className="absolute h-16 w-16" style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${s}) rotate(${i * 25}deg)` }}>
          {kind === "hearts" ? (
            <path d="M24 41 C10 31 5 23 5 16 C5 10 10 6 15.5 6 C19.5 6 22.5 8.5 24 11.5 C25.5 8.5 28.5 6 32.5 6 C38 6 43 10 43 16 C43 23 38 31 24 41Z" fill={fill} />
          ) : (
            <g fill={fill}>
              {Array.from({ length: 5 }, (_, p) => (
                <ellipse key={p} cx="24" cy="12" rx="6" ry="11" transform={`rotate(${p * 72} 24 24)`} />
              ))}
            </g>
          )}
        </svg>
      ))}
    </div>
  );
}

export function GiftRenderer({
  config,
  photoUrls = {},
  withReveal = true,
  showFooter = true,
  embedded = false,
}: {
  config: GiftConfig;
  photoUrls?: Record<string, string>;
  withReveal?: boolean;
  showFooter?: boolean;
  /** Inside the editor preview pane: no fixed decor, compact height. */
  embedded?: boolean;
}) {
  const palette = PALETTE[config.theme.palette];
  const fontClass = FONT_CLASS[config.theme.font];
  const gated = withReveal && (config.reveal === "envelope" || config.reveal === "giftbox");
  const [opened, setOpened] = useState(!gated);
  const locked = useCountdownLocked(config) && !embedded;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!opened || !config.confetti || locked) return;
    const t = setTimeout(() => setCelebrate(true), 350);
    return () => clearTimeout(t);
  }, [opened, config.confetti, locked]);

  const blocks: BlockKind[] = locked ? ["countdown"] : config.blocks;
  const name = config.recipientName.trim();

  const renderBlock = (b: BlockKind) => {
    switch (b) {
      case "greeting":
        return <GreetingBlock config={config} palette={palette} fontClass={fontClass} />;
      case "letter":
        return <Letter config={config} />;
      case "bouquet":
        return (
          <section className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
            <Bouquet bouquet={config.bouquet} className="w-full max-w-[340px] drop-shadow-[0_18px_30px_rgba(43,22,36,0.18)]" />
            {config.bouquet.card && (
              <div className="-mt-10 w-[85%] -rotate-2 rounded-md px-5 py-4 text-center shadow-[var(--shadow-paper)]" style={{ background: palette.surface }}>
                <p className="hand text-2xl leading-snug" style={{ color: palette.ink }}>
                  {config.bouquet.card.replaceAll("{name}", name || "you")}
                </p>
              </div>
            )}
          </section>
        );
      case "photos":
        return <PhotosBlock config={config} urls={photoUrls} palette={palette} />;
      case "reasons":
        return <ReasonsBlock config={config} palette={palette} interactive={!embedded} />;
      case "timeline":
        return <TimelineBlock config={config} palette={palette} />;
      case "countdown":
        return <CountdownBlock config={config} palette={palette} />;
    }
  };

  return (
    <div
      className={`relative ${embedded ? "min-h-full" : "min-h-svh"} w-full`}
      style={{ background: palette.bg, color: palette.ink, colorScheme: palette.dark ? "dark" : "light" }}
    >
      {!embedded && <Decor kind={config.theme.decor} dark={palette.dark} />}
      <Confetti run={celebrate} />
      {!opened ? (
        config.reveal === "giftbox" ? (
          <GiftBoxReveal name={name} palette={palette} onOpen={() => setOpened(true)} />
        ) : (
          <EnvelopeReveal name={name} palette={palette} onOpen={() => setOpened(true)} />
        )
      ) : (
        <main className={`relative mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 ${embedded ? "py-8" : "py-12 sm:py-16"}`}>
          {!config.blocks.includes("greeting") && name && (
            <p className="hand animate-fade text-center text-3xl" style={{ color: palette.accent }}>
              For {name}
            </p>
          )}
          {blocks.map((b, i) => (
            <div key={b} className={config.reveal === "none" ? "" : "animate-rise"} style={{ animationDelay: `${i * 220}ms` }}>
              {renderBlock(b)}
            </div>
          ))}
          {locked && (
            <p className="text-center text-base" style={{ color: palette.soft }}>
              Your message unlocks when the countdown reaches zero. Come back then!
            </p>
          )}
          {config.senderName && !config.blocks.includes("letter") && (
            <p className="hand text-center text-3xl" style={{ color: palette.ink }}>
              — {config.senderName}
            </p>
          )}
          {showFooter && (
            <footer className="mt-4 flex flex-col items-center gap-3 border-t pt-8 text-center text-sm" style={{ borderColor: palette.dark ? "#3b2f50" : "#ecd5dc", color: palette.soft }}>
              {gated && (
                <button type="button" className="underline underline-offset-4" onClick={() => { setCelebrate(false); setOpened(false); }}>
                  Replay the opening
                </button>
              )}
              <p>
                Made with{" "}
                <Link href="/" className="font-semibold underline underline-offset-4" style={{ color: palette.accent }}>
                  Little Moments
                </Link>{" "}
                · <Link href="/create" className="underline underline-offset-4">make one back</Link>
              </p>
            </footer>
          )}
        </main>
      )}
    </div>
  );
}
