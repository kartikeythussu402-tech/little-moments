"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Eye, Link2Off, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { SharePanel, shareUrl } from "@/components/editor/share-panel";
import { Bouquet } from "@/components/gift/bouquet";
import { FORMAT_INFO, type GiftRecord } from "@/lib/gift";
import { getRepo } from "@/lib/repo";
import { PAPER, PALETTE } from "@/lib/theme";

function Thumb({ g }: { g: GiftRecord }) {
  const c = g.config;
  if (c.blocks[0] === "bouquet" || (c.format === "bouquet" && c.blocks.includes("bouquet"))) {
    return (
      <div className="h-full w-full" style={{ background: PALETTE[c.theme.palette].bg }}>
        <Bouquet bouquet={c.bouquet} animate={false} className="mx-auto h-full" />
      </div>
    );
  }
  const paper = PAPER[c.letter.paper];
  return (
    <div className="flex h-full w-full items-center justify-center p-4" style={{ background: PALETTE[c.theme.palette].bg }}>
      <div className="w-4/5 -rotate-2 rounded px-4 py-3 shadow-[var(--shadow-paper)]" style={{ background: paper.bg, color: paper.ink }}>
        <p className={`${paper.font === "hand" ? "hand text-2xl" : "display text-lg"} truncate`}>{c.recipientName ? `Dear ${c.recipientName},` : "Dear…"}</p>
        <div className="mt-2 space-y-1" aria-hidden="true">
          <div className="h-1 rounded" style={{ background: paper.ink, opacity: 0.2 }} />
          <div className="h-1 w-4/5 rounded" style={{ background: paper.ink, opacity: 0.2 }} />
        </div>
      </div>
    </div>
  );
}

function Status({ g }: { g: GiftRecord }) {
  if (g.status === "draft") return <span className="badge bg-blush-200 text-ink">Draft</span>;
  if (!g.sharingEnabled) return <span className="badge bg-ink-mute/15 text-ink-soft">Link off</span>;
  return <span className="badge bg-success/12 text-success ring-1 ring-success/30">Published</span>;
}

export function Dashboard() {
  const { mode, user, loading: authLoading } = useAuth();
  const repo = useMemo(() => getRepo(), []);
  const [gifts, setGifts] = useState<GiftRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharing, setSharing] = useState<GiftRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GiftRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const needsLogin = mode === "live" && !authLoading && !user;

  const load = useCallback(async () => {
    try {
      setError(null);
      setGifts(await repo.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your gifts.");
    }
  }, [repo]);

  useEffect(() => {
    if (mode === "live" && (authLoading || !user)) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [mode, user, authLoading, load]);

  const act = async (id: string, fn: () => Promise<void>, msg?: string) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      if (msg) setNotice(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const replace = (g: GiftRecord) => setGifts((list) => list?.map((x) => (x.id === g.id ? g : x)) ?? null);

  if (needsLogin) {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <h2 className="display text-2xl">Log in to see your gifts</h2>
        <p className="text-ink-soft">Your saved letters and bouquets live in your account, on every device.</p>
        <div className="flex gap-3">
          <Link href="/login?next=/dashboard" className="btn btn-primary">Log in</Link>
          <Link href="/signup" className="btn btn-secondary">Sign up free</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {mode === "demo" && (
        <p className="rounded-2xl border border-dashed border-marigold-deep/50 bg-marigold/15 p-4 text-sm text-ink">
          Demo mode: these gifts are stored in this browser only. Connect Supabase to save them to an account.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-white px-4 py-3 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="underline" onClick={load}>Retry</button>
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          {notice}
        </p>
      )}

      {gifts === null && !error ? (
        <div className="flex justify-center py-20" role="status">
          <Loader2 className="animate-spin text-berry" size={30} aria-hidden="true" />
          <span className="sr-only">Loading your gifts…</span>
        </div>
      ) : gifts && gifts.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <h2 className="display text-3xl">Nothing here yet</h2>
          <p className="max-w-sm text-ink-soft">Your letters, bouquets and surprises will live here. Make your first one — it takes about five minutes.</p>
          <Link href="/create" className="btn btn-primary btn-lg">
            <Plus size={18} aria-hidden="true" /> Create your first gift
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gifts?.map((g) => (
            <li key={g.id} className="card flex flex-col overflow-hidden">
              <Link href={`/editor/${g.id}`} className="block aspect-[16/10] overflow-hidden border-b border-line" aria-label={`Edit ${FORMAT_INFO[g.config.format].label} for ${g.config.recipientName || "someone"}`}>
                <Thumb g={g} />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{g.config.recipientName ? `For ${g.config.recipientName}` : "Untitled gift"}</h3>
                    <p className="text-sm text-ink-mute">
                      {FORMAT_INFO[g.config.format].label} · {new Date(g.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Status g={g} />
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  <Link href={`/editor/${g.id}`} className="btn btn-secondary btn-sm">
                    <Pencil size={14} aria-hidden="true" /> Edit
                  </Link>
                  {g.status === "published" ? (
                    <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setSharing(g)}>
                        <Send size={14} aria-hidden="true" /> Share
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => act(g.id, async () => navigator.clipboard.writeText(shareUrl(g.slug)), "Link copied.")}
                        aria-label="Copy link"
                      >
                        <Copy size={14} aria-hidden="true" />
                      </button>
                      {g.sharingEnabled ? (
                        <Link href={`/gift/${g.slug}`} target="_blank" className="btn btn-ghost btn-sm" aria-label="Open as recipient">
                          <Eye size={14} aria-hidden="true" />
                        </Link>
                      ) : (
                        <span className="btn btn-ghost btn-sm pointer-events-none opacity-50" aria-hidden="true">
                          <Link2Off size={14} />
                        </span>
                      )}
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busyId === g.id}
                    onClick={() =>
                      act(
                        g.id,
                        async () => {
                          const copy = await repo.duplicate(g.id);
                          setGifts((list) => [copy, ...(list ?? [])]);
                        },
                        "Duplicated as a new draft.",
                      )
                    }
                  >
                    Duplicate
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setConfirmDelete(g)} aria-label="Delete gift">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sharing && (
        <SharePanel
          gift={sharing}
          demo={mode === "demo"}
          onClose={() => setSharing(null)}
          onToggleSharing={async (enabled) => {
            const g = await repo.setSharing(sharing.id, enabled);
            setSharing(g);
            replace(g);
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc">
          <div className="animate-rise w-full max-w-sm rounded-3xl bg-cream p-6 shadow-[var(--shadow-lift)]">
            <h2 id="del-title" className="display text-2xl">Delete this gift?</h2>
            <p id="del-desc" className="mt-2 text-ink-soft">
              {confirmDelete.status === "published" ? "The link will stop working for anyone you've sent it to. " : ""}Its photos are deleted too. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)} autoFocus>
                Keep it
              </button>
              <button
                type="button"
                className="btn bg-danger text-white hover:brightness-95"
                disabled={busyId === confirmDelete.id}
                onClick={() =>
                  act(
                    confirmDelete.id,
                    async () => {
                      await repo.remove(confirmDelete.id);
                      setGifts((list) => list?.filter((x) => x.id !== confirmDelete.id) ?? null);
                      setConfirmDelete(null);
                    },
                    "Gift deleted.",
                  )
                }
              >
                {busyId === confirmDelete.id && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
