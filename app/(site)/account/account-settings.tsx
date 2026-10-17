"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Toggle } from "@/components/editor/fields";
import { LANGUAGES } from "@/lib/schemas";

type Profile = { full_name: string | null; phone: string | null; language: string; marketing_consent: boolean; created_at: string };

export function AccountSettings() {
  const { mode, user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", language: "en", marketingConsent: false });
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error"; msg?: string }>({ kind: "idle" });
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "live" || !user) return;
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { profile: Profile; email: string; emailVerified: boolean; error?: string }) => {
        if (d.error) return setState({ kind: "error", msg: d.error });
        setProfile(d.profile);
        setEmail(d.email);
        setVerified(d.emailVerified);
        setForm({ fullName: d.profile?.full_name ?? "", phone: d.profile?.phone ?? "", language: d.profile?.language ?? "en", marketingConsent: Boolean(d.profile?.marketing_consent) });
      })
      .catch(() => setState({ kind: "error", msg: "Couldn't load your account. Check your connection." }));
  }, [mode, user]);

  if (mode === "demo") {
    return (
      <p className="rounded-2xl border border-dashed border-marigold-deep/50 bg-marigold/15 p-5 text-ink">
        Accounts are available once the backend (Supabase) is connected. In demo mode there&apos;s nothing to manage —{" "}
        <Link href="/dashboard" className="font-semibold underline">your demo gifts are here</Link>.
      </p>
    );
  }
  if (!loading && !user) {
    return (
      <p className="text-ink-soft">
        Please <Link href="/login?next=/account" className="font-semibold text-berry underline">log in</Link> to manage your account.
      </p>
    );
  }
  if (!profile) {
    return state.kind === "error" ? (
      <p role="alert" className="text-danger">{state.msg}</p>
    ) : (
      <div className="flex justify-center py-16" role="status">
        <Loader2 className="animate-spin text-berry" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "saving" });
    const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string };
    if (!res?.ok) return setState({ kind: "error", msg: data?.error ?? "Couldn't save. Please try again." });
    setState({ kind: "saved", msg: "Saved." });
  };

  const del = async () => {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string };
    if (!res?.ok) {
      setDeleting(false);
      return setDeleteError(data?.error ?? "Couldn't delete your account. Please try again.");
    }
    // Full reload on purpose: clears every cached client state after the session ends.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/?deleted=1";
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={save} className="card flex flex-col gap-5 p-6 sm:p-8" noValidate>
        <h2 className="text-lg font-bold">Your details</h2>
        <div>
          <span className="field-label">Email</span>
          <p className="flex items-center gap-2 text-ink">
            {email}
            {verified ? (
              <span className="badge bg-success/12 text-success"><BadgeCheck size={13} className="mr-1" aria-hidden="true" />Verified</span>
            ) : (
              <span className="badge bg-marigold/30 text-ink">Not verified</span>
            )}
          </p>
        </div>
        <div>
          <label htmlFor="name" className="field-label">Name</label>
          <input id="name" className="field" value={form.fullName} maxLength={80} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">Phone <span className="font-normal text-ink-mute">(optional)</span></label>
          <input id="phone" type="tel" className="field" value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor="lang" className="field-label">Preferred language</label>
          <select id="lang" className="field" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            {LANGUAGES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-mute">The site is in English for now; we&apos;ll use this as more languages arrive.</p>
        </div>
        <Toggle label="Reminders & offers by email" hint="Optional. Your account works the same either way." checked={form.marketingConsent} onChange={(v) => setForm({ ...form, marketingConsent: v })} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={state.kind === "saving"}>
            {state.kind === "saving" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Save changes
          </button>
          {state.kind === "saved" && <span role="status" className="text-sm font-semibold text-success">{state.msg}</span>}
          {state.kind === "error" && <span role="alert" className="text-sm font-semibold text-danger">{state.msg}</span>}
        </div>
      </form>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-bold">Sign out</h2>
          <p className="text-sm text-ink-soft">Sign out on this device.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={signOut}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </div>

      <div className="card flex flex-col gap-4 border-danger/30 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-danger">Delete account</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          This permanently deletes your login, every gift you&apos;ve made (their links stop working) and all uploaded photos. Personal details in our internal reporting records are erased too. We keep a minimal consent record as required by law — see the{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <label htmlFor="confirm" className="field-label">Type DELETE to confirm</label>
        <input id="confirm" className="field max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        {deleteError && <p role="alert" className="field-error">{deleteError}</p>}
        <button type="button" className="btn btn-danger self-start" disabled={confirm !== "DELETE" || deleting} onClick={del}>
          {deleting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Permanently delete my account
        </button>
      </div>
    </div>
  );
}
