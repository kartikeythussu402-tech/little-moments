"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Cloud, Eye, Loader2, Send, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { GiftRenderer } from "@/components/gift/gift-renderer";
import { buildStartingConfig } from "@/lib/catalog";
import { FORMAT_INFO, GIFT_FORMATS, mergeConfig, parseConfig, type DeepPartial, type GiftConfig, type GiftFormat, type GiftRecord } from "@/lib/gift";
import { validateForPublish } from "@/lib/publish-rules";
import { clearVisitorDraft, getRepo, loadVisitorDraft, saveVisitorDraft } from "@/lib/repo";
import { BouquetPanel, DesignPanel, DetailsPanel, MessagePanel, PhotosPanel } from "./panels";
import { SharePanel } from "./share-panel";

type Tab = "details" | "message" | "bouquet" | "photos" | "design" | "preview";
type SaveState = { kind: "idle" | "saving" | "saved" | "local" | "error"; message?: string };

export function Editor({ id, search }: { id: string; search: Record<string, string | undefined> }) {
  const router = useRouter();
  const { mode, user, loading: authLoading } = useAuth();
  const repo = useMemo(() => getRepo(), []);

  const [config, setConfig] = useState<GiftConfig | null>(null);
  const [gift, setGift] = useState<GiftRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [tab, setTab] = useState<Tab>("details");
  const [preview, setPreview] = useState(false);
  const [share, setShare] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "save" | "publish">(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNew = id === "new";
  const needsAccount = mode === "live" && !user;

  /* ── Load ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isNew) {
        const resumed = search.resume ? loadVisitorDraft() : null;
        const parsed = resumed ? parseConfig(resumed) : null;
        const format = GIFT_FORMATS.includes(search.format as GiftFormat) ? (search.format as GiftFormat) : undefined;
        const start = parsed?.ok ? parsed.config : buildStartingConfig({ format, templateSlug: search.template, occasion: search.occasion });
        if (!cancelled) {
          setConfig(start);
          setSave({ kind: "local" });
        }
        return;
      }
      if (mode === "live" && authLoading) return;
      if (mode === "live" && !user) {
        router.replace(`/login?next=${encodeURIComponent(`/editor/${id}`)}`);
        return;
      }
      try {
        const g = await repo.get(id);
        if (cancelled) return;
        if (!g) {
          setLoadError("We couldn't find this gift. It may have been deleted.");
          return;
        }
        setGift(g);
        setConfig(g.config);
        setSave({ kind: "saved" });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Couldn't load this gift.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, mode, user, authLoading, repo, router, search.format, search.template, search.occasion, search.resume]);

  /* ── Photo URLs (signed for live, data: for demo) ── */
  const refs = config?.photos.items.map((p) => p.ref).join("|") ?? "";
  useEffect(() => {
    const wanted = refs ? refs.split("|") : [];
    const missing = wanted.filter((r) => !urls[r]);
    if (!missing.length) return;
    repo
      .photoUrls(missing)
      .then((u) => setUrls((prev) => ({ ...prev, ...u })))
      .catch(() => undefined);
  }, [refs, repo, urls]);

  /* ── Autosave ── */
  const persist = useCallback(
    async (next: GiftConfig, current: GiftRecord | null) => {
      if (!current) {
        saveVisitorDraft(next);
        setSave({ kind: "local" });
        return;
      }
      setSave({ kind: "saving" });
      try {
        const g = await repo.update(current.id, next);
        setGift(g);
        setSave({ kind: "saved" });
      } catch (e) {
        setSave({ kind: "error", message: e instanceof Error ? e.message : "Couldn't save" });
      }
    },
    [repo],
  );

  useEffect(() => {
    if (!config || !dirty.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(config, gift), gift ? 1200 : 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [config, gift, persist]);

  // Warn before leaving with an unsaved change in flight.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (save.kind === "saving" || (save.kind === "error" && gift)) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [save.kind, gift]);

  const set = useCallback((patch: DeepPartial<GiftConfig>) => {
    dirty.current = true;
    setProblems([]);
    setConfig((c) => (c ? mergeConfig(c, patch) : c));
  }, []);

  /* ── Save as a real gift (asks to sign in when needed) ── */
  const ensureSaved = useCallback(async (): Promise<GiftRecord | null> => {
    if (!config) return null;
    if (gift) return gift;
    if (needsAccount) {
      saveVisitorDraft(config);
      router.push(`/signup?next=${encodeURIComponent("/editor/new?resume=1")}`);
      return null;
    }
    const created = await repo.create(config);
    clearVisitorDraft();
    setGift(created);
    window.history.replaceState(null, "", `/editor/${created.id}`);
    return created;
  }, [config, gift, needsAccount, repo, router]);

  const onSave = async () => {
    setBusy("save");
    try {
      if (gift && config) await persist(config, gift);
      else await ensureSaved();
      if (gift || !needsAccount) setSave({ kind: "saved" });
    } catch (e) {
      setSave({ kind: "error", message: e instanceof Error ? e.message : "Couldn't save" });
    } finally {
      setBusy(null);
    }
  };

  const onPublish = async () => {
    if (!config) return;
    const issues = validateForPublish(config);
    setProblems(issues);
    if (issues.length) return;
    setBusy("publish");
    try {
      const saved = await ensureSaved();
      if (!saved) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const published = await repo.publish(saved.id, config);
      setGift(published);
      setSave({ kind: "saved" });
      setShare(true);
    } catch (e) {
      setSave({ kind: "error", message: e instanceof Error ? e.message : "Couldn't publish" });
    } finally {
      setBusy(null);
    }
  };

  if (loadError) {
    return (
      <div className="container-page flex min-h-[60svh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="text-berry" size={36} aria-hidden="true" />
        <h1 className="display text-3xl">{loadError}</h1>
        <Link href="/dashboard" className="btn btn-primary">
          Go to my gifts
        </Link>
      </div>
    );
  }
  if (!config) {
    return (
      <div className="flex min-h-[70svh] items-center justify-center" role="status">
        <Loader2 className="animate-spin text-berry" size={32} aria-hidden="true" />
        <span className="sr-only">Loading editor…</span>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "details", label: "Details" },
    { id: "message", label: "Message" },
    ...(config.blocks.includes("bouquet") ? [{ id: "bouquet" as Tab, label: "Bouquet" }] : []),
    ...(config.blocks.includes("photos") ? [{ id: "photos" as Tab, label: "Photos" }] : []),
    { id: "design", label: "Design" },
  ];
  const activeTab = tabs.some((t) => t.id === tab) || tab === "preview" ? tab : "details";

  const panel = (() => {
    switch (activeTab) {
      case "details":
        return <DetailsPanel config={config} set={set} />;
      case "message":
        return <MessagePanel config={config} set={set} />;
      case "bouquet":
        return <BouquetPanel config={config} set={set} />;
      case "photos":
        return <PhotosPanel config={config} set={set} giftId={gift?.id ?? null} urls={urls} needsSave={!gift} onRequestSave={onSave} />;
      case "design":
        return <DesignPanel config={config} set={set} />;
      default:
        return null;
    }
  })();

  const statusText = (() => {
    switch (save.kind) {
      case "saving":
        return { icon: <Loader2 size={14} className="animate-spin" />, text: "Saving…" };
      case "saved":
        return { icon: <Check size={14} />, text: mode === "demo" ? "Saved in this browser" : "All changes saved" };
      case "local":
        return { icon: <Cloud size={14} />, text: needsAccount ? "Draft on this device — save to keep it" : "Not saved yet" };
      case "error":
        return { icon: <AlertCircle size={14} />, text: save.message ?? "Couldn't save" };
      default:
        return null;
    }
  })();

  return (
    <div className="flex min-h-svh flex-col bg-blush-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 sm:px-5">
          <Link href={gift || mode === "demo" || user ? "/dashboard" : "/create"} className="btn btn-ghost w-11 px-0" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">
              {FORMAT_INFO[config.format].label}
              {config.recipientName ? ` for ${config.recipientName}` : ""}
            </p>
            {statusText && (
              <p className={`flex items-center gap-1 truncate text-xs ${save.kind === "error" ? "text-danger" : "text-ink-mute"}`} role="status">
                {statusText.icon}
                {statusText.text}
              </p>
            )}
          </div>
          {!gift && (
            <button type="button" className="btn btn-secondary btn-sm hidden sm:inline-flex" onClick={onSave} disabled={busy !== null}>
              {busy === "save" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
              {needsAccount ? "Sign up to save" : "Save draft"}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm hidden sm:inline-flex" onClick={() => setPreview(true)}>
            <Eye size={16} aria-hidden="true" /> Preview
          </button>
          {gift?.status === "published" ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShare(true)}>
              <Send size={15} aria-hidden="true" /> Share
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={onPublish} disabled={busy !== null}>
              {busy === "publish" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              Publish
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-[1400px] lg:grid lg:grid-cols-[460px_1fr]">
          <div role="tablist" aria-label="Editor sections" className="flex gap-1 overflow-x-auto px-3 pb-2 sm:px-5 [scrollbar-width:none]">
            {[...tabs, { id: "preview" as Tab, label: "Preview" }].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors aria-selected:bg-ink aria-selected:text-white ${t.id === "preview" ? "lg:hidden" : ""} ${activeTab === t.id ? "" : "text-ink-soft hover:bg-blush-200"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {problems.length > 0 && (
        <div role="alert" className="mx-auto mt-3 w-full max-w-[1400px] px-3 sm:px-5">
          <div className="rounded-2xl border border-danger/30 bg-white p-4 text-sm">
            <p className="font-semibold text-danger">Almost there — before publishing:</p>
            <ul className="mt-1 list-disc pl-5 text-ink">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {needsAccount && isNew && (
        <p className="mx-auto mt-3 w-full max-w-[1400px] px-3 text-sm text-ink-soft sm:px-5">
          You can create without an account. We&apos;ll ask you to sign up (free) when you save or publish — your draft comes with you.
        </p>
      )}

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 lg:grid-cols-[460px_1fr]">
        <div className={`px-3 py-5 pb-28 sm:px-5 lg:block lg:border-r lg:border-line ${activeTab === "preview" ? "hidden" : ""}`} role="tabpanel">
          {activeTab !== "preview" && panel}
        </div>
        <div className={`lg:block ${activeTab === "preview" ? "block" : "hidden"}`}>
          <div className="lg:sticky lg:top-[112px] lg:h-[calc(100svh-112px)] lg:overflow-y-auto">
            <div className="flex items-center justify-between px-4 pt-4 text-sm text-ink-mute">
              <span>Live preview</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(true)}>
                <Eye size={15} aria-hidden="true" /> Play the opening
              </button>
            </div>
            <div className="m-3 overflow-hidden rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-soft)] sm:m-4">
              <GiftRenderer config={config} photoUrls={urls} withReveal={false} showFooter={false} embedded />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 p-3 backdrop-blur sm:hidden">
        <div className="flex gap-2">
          {!gift && (
            <button type="button" className="btn btn-secondary flex-1" onClick={onSave} disabled={busy !== null}>
              {needsAccount ? "Sign up to save" : "Save"}
            </button>
          )}
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setPreview(true)}>
            <Eye size={16} aria-hidden="true" /> Preview
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Preview as the recipient">
          <button type="button" onClick={() => setPreview(false)} className="btn fixed right-3 top-3 z-[70] bg-ink/85 text-white hover:bg-ink">
            <X size={18} aria-hidden="true" /> Close preview
          </button>
          <GiftRenderer config={config} photoUrls={urls} showFooter={false} />
        </div>
      )}
      {share && gift && (
        <SharePanel
          gift={gift}
          demo={mode === "demo"}
          onClose={() => setShare(false)}
          onToggleSharing={async (enabled) => {
            const g = await repo.setSharing(gift.id, enabled);
            setGift(g);
          }}
        />
      )}
    </div>
  );
}
