import { z } from "zod";
import { clientIp, fail, json, rateLimit, requireUser, syncSoon } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/config";
import { isValidSignature, razorpayConfigured } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

/** POST /api/verify-payment — marks an order paid ONLY when Razorpay's signature checks out. */
export async function POST(req: Request) {
  if (!razorpayConfigured()) return fail("Payments aren't configured on this server.", 503);
  if (!rateLimit(`verify:${clientIp(req)}`, 20, 60_000)) return fail("Too many attempts — please wait a minute.", 429);

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Missing payment details.", 400);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body.data;

  if (!isValidSignature(orderId, paymentId, signature, process.env.RAZORPAY_KEY_SECRET!)) {
    console.warn("[verify-payment] signature mismatch for order", orderId);
    return fail("Payment could not be verified. You have not been marked as paid.", 400);
  }

  // Demo mode (no database): the signature is genuine, but there is nowhere to record it.
  if (!isSupabaseConfigured) return json({ verified: true, recorded: false, order_id: orderId, payment_id: paymentId });

  const auth = await requireUser();
  if ("response" in auth) return fail("Please log in again to finish.", 401);
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("id, user_id, product_id, payment_status")
    .eq("provider_order_id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== auth.user.id) return fail("Order not found.", 404);

  if (order.payment_status !== "paid") {
    const { error } = await db.from("orders").update({ payment_status: "paid", transaction_reference: paymentId }).eq("id", order.id);
    if (error) {
      console.error("[verify-payment] db", error.message);
      return fail("Payment verified but we couldn't save it. Please contact us with your payment ID.", 500);
    }
    const { data: existing } = await db.from("entitlements").select("id").eq("order_id", order.id).maybeSingle();
    if (!existing) await db.from("entitlements").insert({ user_id: auth.user.id, product_id: order.product_id, order_id: order.id });
    syncSoon();
  }

  return json({ verified: true, recorded: true, order_id: orderId, payment_id: paymentId });
}
