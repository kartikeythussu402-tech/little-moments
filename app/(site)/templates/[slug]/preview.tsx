"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { GiftRenderer } from "@/components/gift/gift-renderer";
import type { GiftConfig } from "@/lib/gift";

export function TemplatePreviewLive({ config }: { config: GiftConfig }) {
  const [key, setKey] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setKey((k) => k + 1)}>
          <Play size={15} aria-hidden="true" /> Replay
        </button>
      </div>
      <div className="max-h-[78svh] overflow-y-auto rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-lift)]">
        <GiftRenderer key={key} config={config} embedded showFooter={false} />
      </div>
    </div>
  );
}
