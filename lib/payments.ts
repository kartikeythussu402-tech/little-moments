import { createHmac, timingSafeEqual } from "node:crypto";

/* Server-side price list. The browser only ever sends a productId, so a
   visitor can't change what they pay by editing a request. Amounts in paise. */
export const PRODUCTS = {
  premium_design: { name: "Premium design", amount: 4900, description: "Premium paper styles, reveal animations, no branding" },
  gift_experience: { name: "Gift experience", amount: 9900, description: "Letter + bouquet + 20 photos, gift-box opening" },
  big_surprise: { name: "Big surprise", amount: 19900, description: "Timelines, scrapbooks, multi-step reveals" },
} as const;

export type ProductId = keyof typeof PRODUCTS;
export const MIN_AMOUNT_PAISE = 100;

export function isProductId(v: unknown): v is ProductId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PRODUCTS, v);
}

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Receipt ids must be ≤ 40 chars. */
export function makeReceipt(): string {
  return `lm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Razorpay Standard Checkout signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret), hex. */
export function expectedSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

/** Constant-time comparison so the check can't be probed byte by byte. */
export function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = Buffer.from(expectedSignature(orderId, paymentId, secret), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Shape of errors thrown by the razorpay SDK. */
export interface RazorpayError {
  statusCode?: number;
  error?: { code?: string; description?: string };
}

/** Maps a Razorpay API failure to an HTTP status + safe message for the client. */
export function mapRazorpayError(e: unknown): { status: number; message: string } {
  const err = (e ?? {}) as RazorpayError;
  if (err.statusCode === 401) {
    return { status: 401, message: "Payment provider rejected our credentials. Please contact support." };
  }
  if (err.statusCode === 400) {
    return { status: 500, message: err.error?.description ? `Payment provider error: ${err.error.description}` : "Payment provider rejected the order." };
  }
  return { status: 500, message: "Couldn't reach the payment provider. Please try again in a moment." };
}
