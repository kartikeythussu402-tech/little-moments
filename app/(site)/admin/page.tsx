import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { sheetsConfigured } from "@/lib/sheets/google";
import { runSync } from "@/lib/sheets/store";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Server-side authorisation: profiles.is_admin, checked with the service role. 404 for everyone else. */
async function requireAdmin() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) notFound();
  const { user } = await getSessionUser();
  if (!user) notFound();
  const { data } = await supabaseAdmin().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) notFound();
}

async function syncNow() {
  "use server";
  await requireAdmin();
  await runSync(supabaseAdmin(), 50);
  revalidatePath("/admin");
}

async function retryFailed() {
  "use server";
  await requireAdmin();
  await supabaseAdmin().from("sync_events").update({ status: "pending", next_attempt_at: new Date().toISOString(), attempts: 0 }).in("status", ["failed", "dead"]);
  await runSync(supabaseAdmin(), 50);
  revalidatePath("/admin");
}

interface Metrics {
  users: number;
  signups_by_day: Array<{ day: string; count: number }>;
  gifts: number;
  published: number;
  contacts: number;
  contacts_by_status: Record<string, number>;
  sync: Record<string, number>;
}

export default async function AdminPage() {
  await requireAdmin();
  const db = supabaseAdmin();
  const [{ data: m }, { data: problems }] = await Promise.all([
    db.rpc("admin_metrics"),
    db.from("sync_events").select("id, event_type, entity_key, status, attempts, last_error, created_at, next_attempt_at").in("status", ["failed", "dead"]).order("created_at", { ascending: false }).limit(25),
  ]);
  const metrics = (m ?? {}) as Metrics;
  const max = Math.max(1, ...(metrics.signups_by_day ?? []).map((d) => d.count));
  const stat = (label: string, value: number | string) => (
    <div className="card p-5">
      <p className="text-sm font-semibold text-ink-mute">{label}</p>
      <p className="display mt-1 text-3xl tabular-nums">{value}</p>
    </div>
  );

  return (
    <div className="container-page py-10">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2 text-4xl">Operations</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat("Registered users", metrics.users ?? 0)}
        {stat("Gifts created", metrics.gifts ?? 0)}
        {stat("Published gifts", metrics.published ?? 0)}
        {stat("Contact messages", metrics.contacts ?? 0)}
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-bold">New sign-ups · last 30 days</h2>
        {metrics.signups_by_day?.length ? (
          <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label={`Sign-ups per day: ${metrics.signups_by_day.map((d) => `${d.day} ${d.count}`).join(", ")}`}>
            {metrics.signups_by_day.map((d) => (
              <div key={d.day} className="flex-1 rounded-t bg-berry" style={{ height: `${(d.count / max) * 100}%`, minHeight: 4 }} title={`${d.day}: ${d.count}`} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-ink-soft">No sign-ups yet.</p>
        )}
        <p className="mt-3 text-sm text-ink-mute">
          Contact status: {Object.entries(metrics.contacts_by_status ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}
        </p>
      </section>

      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Google Sheets sync</h2>
            <p className="text-sm text-ink-mute">{sheetsConfigured() ? "Connected" : "Not configured — events are queued safely until credentials are added."}</p>
          </div>
          <div className="flex gap-2">
            <form action={syncNow}>
              <button className="btn btn-secondary btn-sm" type="submit">Sync now</button>
            </form>
            <form action={retryFailed}>
              <button className="btn btn-primary btn-sm" type="submit">Retry failed</button>
            </form>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {["pending", "processing", "synced", "failed", "dead"].map((k) => (
            <div key={k} className="rounded-xl bg-blush-100 p-3">
              <dt className="text-xs font-bold uppercase tracking-wider text-ink-mute">{k}</dt>
              <dd className="display text-2xl tabular-nums">{metrics.sync?.[k] ?? 0}</dd>
            </div>
          ))}
        </dl>
        {problems?.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-ink-mute">
                <tr><th className="py-2 pr-3">Event</th><th className="pr-3">Key</th><th className="pr-3">Status</th><th className="pr-3">Tries</th><th>Last error</th></tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.id} className="border-t border-line align-top">
                    <td className="py-2 pr-3 font-medium">{p.event_type}</td>
                    <td className="pr-3 font-mono text-xs">{String(p.entity_key).slice(0, 12)}…</td>
                    <td className="pr-3">{p.status}</td>
                    <td className="pr-3">{p.attempts}</td>
                    <td className="max-w-md break-words text-xs text-danger">{p.last_error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-success">No failed sync events.</p>
        )}
      </section>
    </div>
  );
}
