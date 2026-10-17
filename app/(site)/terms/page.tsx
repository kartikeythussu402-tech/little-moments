import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/site/prose";
import { CONTACT } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <Prose title="Terms of service" updated="12 October 2026">
      <p><strong>Draft terms — please have them reviewed by a lawyer before public launch.</strong> By using Little Moments you agree to these terms.</p>
      <h2>Using the service</h2>
      <ul>
        <li>You must be 18 or older, or have a parent or guardian&apos;s permission.</li>
        <li>Keep your login safe; you&apos;re responsible for activity on your account.</li>
        <li>Gifts are meant to bring people joy. Don&apos;t use Little Moments to harass, threaten, impersonate, or send anything illegal, hateful or sexually explicit.</li>
      </ul>
      <h2>Your content</h2>
      <p>
        You own what you write and upload. You give us permission to store it and show it to people you share links with, only so we can run the service. Only upload photos you have the right to share, and think about whether the people in them would be happy to be included.
      </p>
      <h2>Sharing links</h2>
      <p>Anyone with a published link can open that gift. You can switch a link off or delete the gift at any time from your dashboard.</p>
      <h2>Templates and artwork</h2>
      <p>Our templates, illustrations and design are original to Little Moments. You may use them inside gifts you create here, but not copy them elsewhere.</p>
      <h2>Prices</h2>
      <p>The basic service is free. Optional premium extras are one-time payments, priced clearly before you pay and processed by Razorpay, a licensed payment provider. We never see or store your card or bank details. Payments are confirmed only after Razorpay&apos;s secure verification. For refunds, contact us within 7 days. See <Link href="/pricing">Pricing</Link>.</p>
      <h2>Availability</h2>
      <p>We work hard to keep Little Moments running, but we can&apos;t promise it will always be available or error-free. To the extent the law allows, we aren&apos;t liable for indirect losses arising from its use.</p>
      <h2>Ending your account</h2>
      <p>You can delete your account anytime in <Link href="/account">Account settings</Link>. We may suspend accounts that break these terms.</p>
      <h2>Changes and law</h2>
      <p>We may update these terms and will note the date above. These terms are governed by the laws of India.</p>
      <h2>Contact</h2>
      <p>Questions? Email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
    </Prose>
  );
}
