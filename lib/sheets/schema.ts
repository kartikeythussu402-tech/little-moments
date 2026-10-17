/** Worksheet layout. Column A is always the stable key used for idempotent upserts. */
export const WORKSHEETS = {
  Users: ["user_id", "full_name", "email", "phone", "signup_timestamp", "auth_provider", "email_verified", "consent_status", "consent_timestamp", "account_status", "referral_source"],
  User_Submissions: ["submission_id", "user_id", "submission_type", "form_name", "submitted_data_json", "submission_timestamp", "consent_reference", "processing_status"],
  Gift_Creations: ["gift_id", "user_id", "occasion", "recipient_name", "relationship", "template_id", "personalized_message", "design_configuration_json", "created_timestamp", "published_timestamp", "sharing_status"],
  Media_Metadata: ["media_id", "user_id", "gift_id", "file_name", "file_type", "file_size", "storage_reference", "upload_timestamp"],
  Feedback_Contact: ["submission_id", "user_id", "name", "email", "category", "message", "submitted_timestamp", "status"],
  Orders_Payments: ["order_id", "user_id", "product_id", "amount", "currency", "payment_provider", "transaction_reference", "payment_status", "created_timestamp"],
  Consent_Audit: ["consent_event_id", "user_id", "consent_type", "consent_status", "policy_version", "timestamp", "source"],
} as const;

export type SheetName = keyof typeof WORKSHEETS;
export type Row = Record<string, string | number | boolean | null | undefined>;

/** Columns blanked when a user exercises their right to erasure. */
export const PII_COLUMNS = new Set(["full_name", "email", "phone", "recipient_name", "personalized_message", "name", "message", "file_name"]);

export function columnLetter(n: number): string {
  let s = "";
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/** Converts a named row into the ordered cell array for a worksheet. */
export function toCells(sheet: SheetName, row: Row): string[] {
  return WORKSHEETS[sheet].map((col) => {
    const v = row[col];
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    const s = String(v);
    // Values are written RAW (never evaluated), but guard against formula
    // injection if the sheet is later exported to CSV and opened elsewhere.
    return /^[=@\t\r]/.test(s) ? `'${s}` : s;
  });
}
