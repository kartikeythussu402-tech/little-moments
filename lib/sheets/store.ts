import type { SupabaseClient } from "@supabase/supabase-js";
import { designSummary, parseConfig } from "../gift";
import { GoogleSheets, sheetsConfigured } from "./google";
import type { Row } from "./schema";
import { drain, type DrainResult, type OutboxEvent, type SyncStore } from "./sync";

/** SyncStore backed by Supabase (service role). */
export class SupabaseSyncStore implements SyncStore {
  constructor(private db: SupabaseClient) {}

  async claim(limit: number) {
    const { data, error } = await this.db.rpc("claim_sync_events", { p_limit: limit });
    if (error) throw new Error(`claim failed: ${error.message}`);
    return (data ?? []) as OutboxEvent[];
  }

  async markSynced(ids: string[]) {
    if (!ids.length) return;
    const { error } = await this.db.from("sync_events").update({ status: "synced", synced_at: new Date().toISOString(), last_error: null, locked_at: null }).in("id", ids);
    if (error) throw new Error(`markSynced failed: ${error.message}`);
  }

  async markFailed(id: string, message: string, next: Date, dead: boolean) {
    await this.db
      .from("sync_events")
      .update({ status: dead ? "dead" : "failed", last_error: message, next_attempt_at: next.toISOString(), locked_at: null })
      .eq("id", id);
  }

  async loadUser(id: string): Promise<Row | null> {
    const [{ data: auth }, { data: profile }] = await Promise.all([
      this.db.auth.admin.getUserById(id),
      this.db.from("profiles").select("*").eq("id", id).maybeSingle(),
    ]);
    const user = auth?.user;
    if (!user || !profile) return null;
    const terms = profile.terms_accepted_at ? "granted" : "not_recorded";
    return {
      user_id: id,
      full_name: profile.full_name,
      email: user.email,
      phone: profile.phone,
      signup_timestamp: user.created_at,
      auth_provider: (user.app_metadata?.provider as string) ?? "email",
      email_verified: Boolean(user.email_confirmed_at),
      consent_status: `terms:${terms}; marketing:${profile.marketing_consent ? "granted" : "not_granted"}`,
      consent_timestamp: profile.consent_timestamp,
      account_status: profile.account_status,
      referral_source: profile.referral_source,
    };
  }

  async loadGift(id: string, includeMessage: boolean): Promise<Row | null> {
    const { data: g } = await this.db.from("gifts").select("*").eq("id", id).maybeSingle();
    if (!g) return null;
    const parsed = parseConfig(g.config);
    const cfg = parsed.ok ? parsed.config : null;
    return {
      gift_id: g.id,
      user_id: g.owner_id,
      occasion: g.occasion_slug,
      recipient_name: g.recipient_name,
      relationship: g.relationship,
      template_id: g.template_slug,
      personalized_message: includeMessage && cfg?.blocks.includes("letter") ? cfg.letter.body : `ref:gifts/${g.id}`,
      design_configuration_json: cfg ? JSON.stringify(designSummary(cfg)) : "{}",
      created_timestamp: g.created_at,
      published_timestamp: g.published_at,
      sharing_status: g.status === "published" ? (g.sharing_enabled ? "published_link_on" : "published_link_off") : "draft",
    };
  }

  async loadContact(id: string): Promise<Row | null> {
    const { data: c } = await this.db.from("contact_submissions").select("*").eq("id", id).maybeSingle();
    if (!c) return null;
    return { submission_id: c.id, user_id: c.user_id, name: c.name, email: c.email, category: c.category, message: c.message, submitted_timestamp: c.created_at, status: c.status };
  }

  async loadOrder(id: string): Promise<Row | null> {
    const { data: o } = await this.db.from("orders").select("*").eq("id", id).maybeSingle();
    if (!o) return null;
    return {
      order_id: o.id,
      user_id: o.user_id,
      product_id: o.product_id,
      amount: (o.amount_paise / 100).toFixed(2),
      currency: o.currency,
      payment_provider: o.payment_provider,
      transaction_reference: o.transaction_reference,
      payment_status: o.payment_status,
      created_timestamp: o.created_at,
    };
  }
}

/** Drain the outbox once. Safe to call from cron, after() hooks and the admin page. */
export async function runSync(db: SupabaseClient, limit = 25): Promise<DrainResult> {
  return drain({
    store: new SupabaseSyncStore(db),
    sheets: sheetsConfigured() ? new GoogleSheets() : null,
    limit,
    includeMessages: process.env.SHEETS_INCLUDE_MESSAGE_TEXT === "true",
  });
}
