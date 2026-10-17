"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

/* Razorpay Standard Web Checkout. Only the public KEY_ID is used here;
   the secret stays on the server (create-order / verify-payment). */

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayFailure {
  error: { code?: string; description?: string; reason?: string };
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: RazorpayFailure) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
export const isCheckoutConfigured = Boolean(KEY_ID);

let scriptPromise: Promise<boolean> | null = null;
function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve(Boolean(window.Razorpay));
      s.onerror = () => {
        scriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

type State =
  | { kind: "idle" }
  | { kind: "busy"; step: string }
  | { kind: "success"; paymentId: string; recorded: boolean }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

export function CheckoutButton({ productId, label, className = "btn btn-primary", dark = false }: { productId: string; label: string; className?: string; dark?: boolean }) {
  const { mode, user } = useAuth();
  const [state, setState] = useState<State>({ kind: "idle" });
  const tone = dark ? "text-blush-100" : "text-ink-soft";

  if (!isCheckoutConfigured) {
    return <p className={`text-sm ${tone}`}>Payments aren&apos;t configured yet.</p>;
  }
  if (mode === "live" && !user) {
    return (
      <Link href="/login?next=/pricing" className={className}>
        Log in to buy
      </Link>
    );
  }

  const pay = async () => {
    setState({ kind: "busy", step: "Preparing…" });
    const loaded = await loadCheckoutScript();
    if (!loaded || !window.Razorpay) {
      return setState({ kind: "error", message: "Couldn't load the payment window. Check your connection or disable ad-blockers and try again." });
    }

    // 1. Ask our server to create the order (amount comes from the server price list).
    let order: { order_id: string; amount: number; currency: string; product: string };
    try {
      const res = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setState({ kind: "error", message: data.error ?? "Couldn't start the payment." });
      order = data;
    } catch {
      return setState({ kind: "error", message: "You seem to be offline. Please try again." });
    }

    // 2. Open the Razorpay modal.
    setState({ kind: "busy", step: "Waiting for payment…" });
    const rzp = new window.Razorpay({
      key: KEY_ID,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Little Moments",
      description: order.product,
      prefill: user ? { email: user.email ?? "", name: (user.user_metadata?.full_name as string) ?? "" } : {},
      theme: { color: "#a3214a" },
      modal: {
        ondismiss: () => setState((s) => (s.kind === "busy" ? { kind: "cancelled" } : s)),
      },
      // 3. On success, send all three values to the server for signature verification.
      handler: async (resp: RazorpaySuccess) => {
        setState({ kind: "busy", step: "Verifying payment…" });
        try {
          const res = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.verified) {
            return setState({ kind: "error", message: data.error ?? "We couldn't verify this payment. If money was deducted, contact us with your payment ID." });
          }
          setState({ kind: "success", paymentId: resp.razorpay_payment_id, recorded: Boolean(data.recorded) });
        } catch {
          setState({ kind: "error", message: `Network error while verifying. Your payment ID is ${resp.razorpay_payment_id} — contact us if it isn't reflected.` });
        }
      },
    });
    rzp.on("payment.failed", (r) => {
      setState({ kind: "error", message: r.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. No money was taken — please try again." });
    });
    rzp.open();
  };

  if (state.kind === "success") {
    return (
      <p role="status" className={`flex items-start gap-2 text-sm font-semibold ${dark ? "text-white" : "text-success"}`}>
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Payment verified. Thank you!
          <span className={`block font-normal ${tone}`}>
            Payment ID {state.paymentId}
            {state.recorded ? " · saved to your account" : " · demo mode, not saved to an account"}
          </span>
        </span>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={className} onClick={pay} disabled={state.kind === "busy"}>
        {state.kind === "busy" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {state.kind === "busy" ? state.step : label}
      </button>
      {state.kind === "cancelled" && (
        <p role="status" className={`text-sm ${tone}`}>
          Payment cancelled — you haven&apos;t been charged.
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className={`text-sm font-medium ${dark ? "text-blush-200" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
