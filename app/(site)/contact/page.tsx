import type { Metadata } from "next";
import { ContactLinks } from "@/components/site/site-footer";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact & feedback", description: "Talk to the Little Moments team by email, phone or the contact form." };

export default function ContactPage() {
  return (
    <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col gap-5">
        <p className="eyebrow">Contact</p>
        <h1 className="display text-4xl text-ink sm:text-5xl">We&apos;d love to hear from you</h1>
        <p className="text-lg leading-relaxed text-ink-soft">Questions, ideas, a bug, or help with a gift you&apos;re making — reach us however suits you.</p>
        <div className="card p-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-berry">Email & phone</h2>
          <ContactLinks />
        </div>
      </div>
      <ContactForm />
    </div>
  );
}
