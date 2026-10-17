import Razorpay from "razorpay";
import { z } from "zod";
import { clientIp, fail, json, rateLimit, requireUser, syncSoon } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/config";
import { isProductId, makeReceipt, mapRazorpayError, MIN_AMOUNT_PAISE, PRODUCTS, razorpayConfigured } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({ productId: z.string().max(40) });

/** POST /api/create-order — creates a Razorpay order for a product from the server-side price list. */
export async function POST(req: Request) {
  if (!razorpayConfigured()) return fail("Payments aren't configured on this server.", 503);
  if (!rateLimit(`order:${clientIp(req)}`, 10, 60_000)) return fail("Too many attempts — please wait a minute.", 429);

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success || !isProductId(body.data.productId)) return fail("Choose a valid product.", 400);
  const product = PRODUCTS[body.data.productId];
  if (!Number.isInteger(product.amount) || product.amount < MIN_AMOUNT_PAISE) return fail(`Amount must be at least ${MIN_AMOUNT_PAISE} paise.`, 400);

  // With accounts switched on, purchases belong to a signed-in user.
  let userId: string | null = null;
  if (isSupabaseConfigured) {
    const auth = await requireUser();
    if ("response" in auth) return fail("Please log in to buy.", 401);
    userId = auth.user.id;
  }

  const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  let order: { id: string; amount: number | string; currency: string };
  try {
    order = await razorpay.orders.create({
      amount: product.amount,
      currency: "INR",
      receipt: makeReceipt(),
      notes: { product_id: body.data.productId, ...(userId ? { user_id: userId } : {}) },
    });
  } catch (e) {
    const mapped = mapRazorpayError(e);
    console.error("[create-order]", (e as { error?: { description?: string } })?.error?.description ?? (e as Error)?.message);
    return fail(mapped.message, mapped.status);
  }

  if (userId) {
    const { error } = await supabaseAdmin().from("orders").insert({
      user_id: userId,
      product_id: body.data.productId,
      amount_paise: product.amount,
      currency: "INR",
      payment_provider: "razorpay",
      provider_order_id: order.id,
      payment_status: "created",
    });
    if (error) {
      console.error("[create-order] db", error.message);
      return fail("Couldn't start the payment. Please try again.", 500);
    }
    syncSoon();
  }

  return json({ order_id: order.id, amount: Number(order.amount), currency: order.currency, product: product.name }, 201);
}
