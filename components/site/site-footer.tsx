import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { BRAND, CONTACT } from "@/lib/config";
import { LogoMark } from "./logo";

export function ContactLinks({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const link = tone === "light" ? "text-blush-50 hover:text-white" : "text-ink hover:text-berry";
  return (
    <ul className={`flex flex-col gap-1 ${className}`}>
      <li>
        <a href={`mailto:${CONTACT.email}`} className={`inline-flex min-h-11 items-center gap-2.5 font-medium break-all underline-offset-4 hover:underline ${link}`}>
          <Mail size={18} aria-hidden="true" className="shrink-0" />
          {CONTACT.email}
        </a>
      </li>
      {CONTACT.phones.map((p) => (
        <li key={p.tel}>
          <a href={`tel:${p.tel}`} className={`inline-flex min-h-11 items-center gap-2.5 font-medium underline-offset-4 hover:underline ${link}`}>
            <Phone size={18} aria-hidden="true" className="shrink-0" />
            {p.display}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-blush-100">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-blush-100 p-1">
              <LogoMark size={30} />
            </span>
            <span className="display text-2xl text-white">Little Moments</span>
          </div>
          <p className="max-w-xs leading-relaxed text-blush-200">{BRAND.promise}</p>
          <Link href="/create" className="btn bg-blush-100 text-ink hover:bg-white self-start">
            Create your gift
          </Link>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-marigold">Make</h2>
          <ul className="flex flex-col gap-1 text-blush-50">
            {[
              ["/create?format=letter", "Write a letter"],
              ["/create?format=bouquet", "Build a bouquet"],
              ["/occasions", "Browse occasions"],
              ["/templates", "All templates"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-10 items-center hover:text-white hover:underline underline-offset-4">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-marigold">Little print</h2>
          <ul className="flex flex-col gap-1 text-blush-50">
            {[
              ["/pricing", "Pricing"],
              ["/privacy", "Privacy policy"],
              ["/terms", "Terms of service"],
              ["/contact", "Contact & feedback"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-10 items-center hover:text-white hover:underline underline-offset-4">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-marigold">Talk to us</h2>
          <ContactLinks tone="light" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-sm text-blush-200">© {new Date().getFullYear()} Little Moments · Made with care in India</p>
      </div>
    </footer>
  );
}
