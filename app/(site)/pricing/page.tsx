import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/payments/checkout-button";

export const metadata: Metadata = { title: "Pricing", description: "Little Moments is free to start. Premium extras are small one-time prices, paid securely with Razorpay." };

const TEST_MODE = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");

const TIERS = [
  { name: "Basic", price: "Free", note: "Always free", productId: null, features: ["Letters in every paper style", "Virtual bouquets up to 12 stems", "Up to 3 photos per gift", "Private share links + WhatsApp", "Edit after sending"] },
  { name: "Premium design", price: "₹49", note: "one-time", productId: "premium_design", features: ["Premium templates & letter styles", "Advanced reveal animations", "No Little Moments branding"] },
  { name: "Gift experience", price: "₹99", note: "one-time", productId: "gift_experience", features: ["Letter + bouquet + up to 20 photos", "Gift-box opening", "Custom link name"], featured: true },
  { name: "Big surprise", price: "₹199", note: "one-time", productId: "big_surprise", features: ["Timelines, scrapbooks & countdowns", "Multiple reveal moments", "Expanded personalisation"] },
];

export default function PricingPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Pricing</p>
      <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">Free to start. Small extras when you want them.</h1>
      <div className="mt-6 max-w-2xl rounded-2xl border border-line bg-cream p-5 text-ink">
        {TEST_MODE ? (
          <>
            <p className="font-semibold">Payments are in test mode — no real money is taken.</p>
            <p className="mt-1 text-ink-soft">
              Use Razorpay&apos;s test details: UPI <strong className="text-ink">success@razorpay</strong>, or card <strong className="text-ink">4111 1111 1111 1111</strong> with any future expiry and any CVV.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold">Secure payments by Razorpay.</p>
            <p className="mt-1 text-ink-soft">UPI, cards, netbanking and wallets. You&apos;ll always see the price before you pay.</p>
          </>
        )}
      </div>
      <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <li key={t.name} className={`flex flex-col gap-4 rounded-[var(--radius-card)] p-6 ${t.featured ? "bg-ink text-white shadow-[var(--shadow-lift)]" : "card"}`}>
            <div>
              <h2 className="text-lg font-bold">{t.name}</h2>
              <p className="display mt-2 text-4xl">{t.price}</p>
              <p className={`text-sm ${t.featured ? "text-blush-200" : "text-ink-mute"}`}>{t.note}</p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2"><Check size={16} className={`mt-0.5 shrink-0 ${t.featured ? "text-marigold" : "text-berry"}`} aria-hidden="true" />{f}</li>
              ))}
            </ul>
            <div className="mt-auto">
              {t.productId ? (
                <CheckoutButton
                  productId={t.productId}
                  label={`Buy for ${t.price}`}
                  dark={t.featured}
                  className={`btn w-full ${t.featured ? "bg-marigold text-ink hover:brightness-95" : "btn-primary"}`}
                />
              ) : (
                <Link href="/create" className="btn btn-secondary w-full">Start free</Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
