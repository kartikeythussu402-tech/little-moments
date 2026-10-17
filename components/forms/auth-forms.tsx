"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { isSupabaseConfigured, siteUrl } from "@/lib/config";
import { safeNext } from "@/lib/schemas";
import { supabaseBrowser } from "@/lib/supabase/client";

function DemoNotice() {
  return (
    <div className="rounded-2xl border border-dashed border-marigold-deep/50 bg-marigold/15 p-5 text-ink">
      <p className="font-semibold">Accounts aren&apos;t switched on yet (demo mode).</p>
      <p className="mt-1 text-sm text-ink-soft">Once Supabase is connected, sign-up and login work here. For now you can still create, preview and “publish” gifts — they&apos;re saved in this browser.</p>
      <Link href="/create" className="btn btn-primary btn-sm mt-4">
        Create a gift
      </Link>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/25 bg-white px-4 py-3 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(sp.get("error") === "link" ? "That link has expired or was already used. Please log in or request a new one." : null);
  const [busy, setBusy] = useState(false);
  if (!isSupabaseConfigured) return <DemoNotice />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Please enter your email address.");
    if (!password) return setError("Please enter your password.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(error.message.toLowerCase().includes("confirm") ? "Please verify your email first — check your inbox for our link." : "That email and password don't match. Try again or reset your password.");
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <ErrorText>{error}</ErrorText>}
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="field-label">Password</label>
          <Link href="/forgot-password" className="text-sm font-semibold text-berry underline-offset-4 hover:underline">Forgot?</Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary btn-lg mt-2" disabled={busy}>
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Log in
      </button>
      <p className="text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-berry underline underline-offset-4">Create a free account</Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const [f, setF] = useState({ fullName: "", email: "", password: "", phone: "", referralSource: "", acceptTerms: false, marketingConsent: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  if (!isSupabaseConfigured) return <DemoNotice />;

  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!f.fullName.trim()) return setError("Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Please enter a valid email address.");
    if (f.password.length < 8) return setError("Your password needs at least 8 characters.");
    if (!f.acceptTerms) return setError("Please accept the Terms and Privacy Policy to continue.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, next }) });
      const data = (await res.json()) as { error?: string; needsVerification?: boolean; alreadyRegistered?: boolean };
      if (!res.ok) return setError(data.error ?? "Couldn't create your account.");
      if (data.alreadyRegistered) return setError("An account with this email already exists. Try logging in.");
      if (data.needsVerification) setSentTo(f.email);
      else {
        router.replace(next);
        router.refresh();
      }
    } catch {
      setError("You seem to be offline. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center" role="status">
        <MailCheck size={40} className="text-berry" aria-hidden="true" />
        <h2 className="display text-2xl">Check your inbox</h2>
        <p className="text-ink-soft">
          We sent a verification link to <strong className="text-ink">{sentTo}</strong>. Tap it to finish signing up — your draft will be waiting.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <ErrorText>{error}</ErrorText>}
      <div>
        <label htmlFor="fullName" className="field-label">Your name</label>
        <input id="fullName" autoComplete="name" className="field" value={f.fullName} onChange={upd("fullName")} maxLength={80} required />
      </div>
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" type="email" autoComplete="email" className="field" value={f.email} onChange={upd("email")} required />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" type="password" autoComplete="new-password" className="field" value={f.password} onChange={upd("password")} minLength={8} aria-describedby="pw-hint" required />
        <p id="pw-hint" className="mt-1 text-xs text-ink-mute">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="phone" className="field-label">Phone <span className="font-normal text-ink-mute">(optional)</span></label>
        <input id="phone" type="tel" autoComplete="tel" className="field" value={f.phone} onChange={upd("phone")} placeholder="+91" maxLength={20} />
      </div>
      <div>
        <label htmlFor="ref" className="field-label">How did you hear about us? <span className="font-normal text-ink-mute">(optional)</span></label>
        <select id="ref" className="field" value={f.referralSource} onChange={upd("referralSource")}>
          <option value="">Choose…</option>
          {["Instagram", "WhatsApp", "A friend", "Received a gift", "Google", "College", "Other"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-berry" checked={f.acceptTerms} onChange={upd("acceptTerms")} required />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-berry underline underline-offset-4">Terms</Link> and{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-berry underline underline-offset-4">Privacy Policy</Link>. <span className="text-danger">*</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-berry" checked={f.marketingConsent} onChange={upd("marketingConsent")} />
        <span>Send me occasional reminders and offers. <span className="text-ink-mute">Optional — you can change this anytime.</span></span>
      </label>
      <button type="submit" className="btn btn-primary btn-lg mt-2" disabled={busy}>
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Create my free account
      </button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-berry underline underline-offset-4">Log in</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  if (!isSupabaseConfigured) return <DemoNotice />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email address.");
    setState("busy");
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
    if (error && !error.message.toLowerCase().includes("rate")) {
      setState("idle");
      return setError("Couldn't send the email right now. Please try again in a minute.");
    }
    setState("sent");
  };
  if (state === "sent") {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl bg-white p-5 text-ink">
        <CheckCircle2 className="shrink-0 text-success" aria-hidden="true" /> If an account exists for {email}, a reset link is on its way. It expires in an hour.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <ErrorText>{error}</ErrorText>}
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary btn-lg" disabled={state === "busy"}>
        {state === "busy" && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Send reset link
      </button>
    </form>
  );
}

export function ResetForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isSupabaseConfigured) return <DemoNotice />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError("This reset link has expired. Please request a new one.");
    router.replace("/dashboard?reset=1");
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <ErrorText>{error}</ErrorText>}
      <div>
        <label htmlFor="pw" className="field-label">New password</label>
        <input id="pw" type="password" autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="pw2" className="field-label">Repeat new password</label>
        <input id="pw2" type="password" autoComplete="new-password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Save new password
      </button>
    </form>
  );
}
