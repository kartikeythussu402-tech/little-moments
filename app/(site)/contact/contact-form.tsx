"use client";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { isSupabaseConfigured, CONTACT } from "@/lib/config";

const CATEGORIES = [
  ["question", "A question"],
  ["feedback", "Feedback or an idea"],
  ["bug", "Something isn't working"],
  ["privacy", "Privacy or my data"],
  ["other", "Something else"],
] as const;

export function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", category: "question", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <p className="rounded-2xl border border-dashed border-marigold-deep/50 bg-marigold/15 p-5 text-ink">
        The contact form saves to our backend, which isn&apos;t connected in this demo. Please email{" "}
        <a className="font-semibold underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> instead.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = "Please enter a valid email address.";
    if (f.message.trim().length < 5) errs.message = "Please write a few more words.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("busy");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setServerError(data.error ?? "We couldn't send your message.");
        return setState("error");
      }
      setState("sent");
    } catch {
      setServerError("You seem to be offline. Please try again.");
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 size={40} className="text-success" aria-hidden="true" />
        <h2 className="display text-2xl">Thank you — we got it</h2>
        <p className="text-ink-soft">Your message is saved and we&apos;ll reply to {f.email} soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6 sm:p-8" noValidate>
      {state === "error" && <p role="alert" className="rounded-xl border border-danger/25 bg-white px-4 py-3 text-sm font-medium text-danger">{serverError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="field-label">Name</label>
          <input id="c-name" className="field" autoComplete="name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "c-name-e" : undefined} />
          {errors.name && <p id="c-name-e" className="field-error">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="c-email" className="field-label">Email</label>
          <input id="c-email" type="email" className="field" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!errors.email} aria-describedby={errors.email ? "c-email-e" : undefined} />
          {errors.email && <p id="c-email-e" className="field-error">{errors.email}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="c-cat" className="field-label">What&apos;s it about?</label>
        <select id="c-cat" className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="c-msg" className="field-label">Message</label>
        <textarea id="c-msg" className="field" rows={6} maxLength={2000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} aria-invalid={!!errors.message} aria-describedby={errors.message ? "c-msg-e" : undefined} />
        {errors.message && <p id="c-msg-e" className="field-error">{errors.message}</p>}
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="c-web">Website</label>
        <input id="c-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      </div>
      <p className="text-xs text-ink-mute">We use your details only to reply. See our Privacy Policy.</p>
      <button type="submit" className="btn btn-primary btn-lg self-start" disabled={state === "busy"}>
        {state === "busy" && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Send message
      </button>
    </form>
  );
}
