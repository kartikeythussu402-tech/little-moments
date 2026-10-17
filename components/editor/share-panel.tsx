"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Share2, X } from "lucide-react";
import { siteUrl } from "@/lib/config";
import type { GiftRecord } from "@/lib/gift";
import { Toggle } from "./fields";

export function shareUrl(slug: string) {
  return `${siteUrl()}/gift/${slug}`;
}

export function whatsappLink(gift: GiftRecord) {
  const name = gift.config.recipientName.trim();
  const text = `${name ? `${name}, ` : ""}I made something for you 💌 ${shareUrl(gift.slug)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function SharePanel({
  gift,
  onToggleSharing,
  onClose,
  demo,
}: {
  gift: GiftRecord;
  onToggleSharing: (enabled: boolean) => Promise<void>;
  onClose: () => void;
  demo: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const url = shareUrl(gift.slug);

  useEffect(() => {
    const t = setTimeout(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), 0);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.getElementById("share-url") as HTMLInputElement | null;
      el?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "A little moment for you", text: "I made something for you", url });
    } catch {
      /* user cancelled */
    }
  };

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await onToggleSharing(enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animate-rise relative w-full max-w-md rounded-t-3xl bg-cream p-6 shadow-[var(--shadow-lift)] sm:rounded-3xl sm:p-8">
        <button ref={closeRef} type="button" onClick={onClose} className="btn btn-ghost absolute right-3 top-3 w-11 px-0" aria-label="Close">
          <X size={20} />
        </button>
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-marigold text-ink" aria-hidden="true">
            <Check size={28} strokeWidth={3} />
          </span>
          <h2 id="share-title" className="display text-3xl text-ink">
            It&apos;s ready to send
          </h2>
          <p className="text-ink-soft">
            {gift.config.recipientName ? `For ${gift.config.recipientName}. ` : ""}Only people with this link can open it.
          </p>
        </div>

        {demo && (
          <p className="mb-4 rounded-xl border border-dashed border-marigold-deep/50 bg-marigold/15 p-3 text-sm text-ink">
            Demo mode: this link only opens in this browser. Connect Supabase (see README) to share it with anyone.
          </p>
        )}

        <label htmlFor="share-url" className="sr-only">
          Share link
        </label>
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-1.5 pl-4">
          <input id="share-url" readOnly value={url} className="min-w-0 flex-1 truncate bg-transparent text-[15px] text-ink outline-none" onFocus={(e) => e.target.select()} />
          <button type="button" onClick={copy} className="btn btn-primary btn-sm shrink-0">
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Link copied to clipboard" : ""}
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <a href={whatsappLink(gift)} target="_blank" rel="noopener noreferrer" className={`btn btn-lg bg-[#1f7a4d] text-white hover:bg-[#186540] ${!gift.sharingEnabled ? "pointer-events-none opacity-50" : ""}`} aria-disabled={!gift.sharingEnabled}>
            <WhatsAppIcon /> Send on WhatsApp
          </a>
          {canShare && (
            <button type="button" onClick={nativeShare} className="btn btn-secondary btn-lg" disabled={!gift.sharingEnabled}>
              <Share2 size={18} aria-hidden="true" /> More ways to share
            </button>
          )}
          <Link href={`/gift/${gift.slug}`} target="_blank" className="btn btn-ghost">
            <ExternalLink size={16} aria-hidden="true" /> Open as they&apos;ll see it
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-white p-4">
          <Toggle
            label={gift.sharingEnabled ? "Link is on" : "Link is off"}
            hint={gift.sharingEnabled ? "Turn off to stop anyone opening it. You can turn it back on later." : "Nobody can open this gift right now."}
            checked={gift.sharingEnabled}
            onChange={(v) => !busy && toggle(v)}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
