import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/site/prose";
import { CONTACT } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <Prose title="Privacy policy" updated="12 October 2026">
      <p>
        Little Moments (“we”) helps you make personal letters, virtual bouquets and digital gifts. Your words and photos are personal, so we collect as little as we can and protect what we keep. This policy is written to meet India&apos;s Digital Personal Data Protection Act, 2023. <strong>It is a starting draft and should be reviewed by a qualified lawyer before public launch.</strong>
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> name, email, optional phone number, how you heard about us, language preference, and your consent choices.</li>
        <li><strong>Gifts you create:</strong> recipient&apos;s first name, your messages, design choices, flowers, and photos you upload.</li>
        <li><strong>Contact messages:</strong> name, email, category and message.</li>
        <li><strong>Technical data:</strong> standard server logs needed to run and secure the service. We do not use hidden device fingerprinting or record keystrokes.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To run your account and show your gifts to the people you share them with (necessary to provide the service).</li>
        <li>To answer your messages and keep the service safe (legitimate use).</li>
        <li>To send reminders or offers — <strong>only if you opted in</strong>. Signing up does not mean you agreed to marketing; you can switch it off any time in Account settings.</li>
      </ul>
      <h2>Who can see your gifts</h2>
      <p>
        Drafts are private to you. A published gift can be opened by anyone who has its link; links are long and random so they can&apos;t be guessed, and you can switch a link off at any time. Photos are kept in private storage and shown only through short-lived secure links when someone opens your gift.
      </p>
      <h2>Internal reporting (Google Sheets)</h2>
      <p>
        So our small team can see how the service is used, we copy a <strong>minimised</strong> set of records to a private Google Sheet that only authorised team members and our server&apos;s service account can access. It includes account details (name, email, optional phone, sign-up date, consent status), gift metadata (occasion, template, recipient first name, design choices and status), photo metadata (file name, type and size — never the photo itself), contact-form submissions and consent records. <strong>The text of your letters is not copied</strong> unless we tell you otherwise in an update to this policy. The sheet is never public.
      </p>
      <h2>Service providers</h2>
      <p>We use Supabase (database, login and file storage), Vercel (hosting), Razorpay (payments — they handle your card, UPI or bank details; we only receive an order and payment reference) and Google Workspace (internal reporting). They process data on our behalf under their own security and privacy commitments. We do not sell your data.</p>
      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and gifts: until you delete them or your account.</li>
        <li>Contact messages: up to 24 months.</li>
        <li>Consent records: kept after account deletion where the law requires us to prove consent, without other personal details.</li>
        <li>Backups are overwritten on a rolling basis.</li>
      </ul>
      <h2>Your rights</h2>
      <p>
        You can see and update your details in <Link href="/account">Account settings</Link>, delete individual gifts from your dashboard, and permanently delete your account there too — this removes your gifts, photos and login and erases your personal details from our reporting sheet. You can also ask us for a copy of your data, a correction, or to raise a grievance by writing to{" "}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>. We aim to respond within 30 days.
      </p>
      <h2>Children</h2>
      <p>Little Moments is meant for people aged 18 and over. If you are under 18, please use it with a parent or guardian&apos;s permission.</p>
      <h2>Security</h2>
      <p>We use encryption in transit, access controls on every database table, private file storage, and keep secrets on the server only. No system is perfectly secure; if something goes wrong we will tell affected users and the authorities as the law requires.</p>
      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or call {CONTACT.phones.map((p, i) => (
          <span key={p.tel}>{i > 0 && " or "}<a href={`tel:${p.tel}`}>{p.display}</a></span>
        ))}.
      </p>
    </Prose>
  );
}
