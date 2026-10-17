"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Logo } from "./logo";

const NAV = [
  { href: "/occasions", label: "Occasions" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { user, mode, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const accountLinks =
    mode === "demo" ? (
      <Link href="/dashboard" className="btn btn-ghost">
        My gifts
      </Link>
    ) : user ? (
      <>
        <Link href="/dashboard" className="btn btn-ghost">
          My gifts
        </Link>
        <Link href="/account" className="btn btn-ghost">
          Account
        </Link>
      </>
    ) : (
      <Link href="/login" className="btn btn-ghost">
        Log in
      </Link>
    );

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-blush-100/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? "page" : undefined} className="btn btn-ghost aria-[current=page]:text-berry">
              {n.label}
            </Link>
          ))}
          {accountLinks}
          <Link href="/create" className="btn btn-primary ml-2">
            Create your gift
          </Link>
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/create" className="btn btn-primary btn-sm">
            Create
          </Link>
          <button type="button" className="btn btn-ghost w-11 px-0" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="animate-fade border-t border-line bg-cream lg:hidden">
          <div className="container-page flex flex-col py-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="flex min-h-12 items-center rounded-lg px-2 text-lg font-semibold hover:bg-blush-200">
                {n.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-line" />
            {mode === "live" && user ? (
              <>
                <Link href="/dashboard" className="flex min-h-12 items-center rounded-lg px-2 text-lg font-semibold hover:bg-blush-200">
                  My gifts
                </Link>
                <Link href="/account" className="flex min-h-12 items-center rounded-lg px-2 text-lg font-semibold hover:bg-blush-200">
                  Account
                </Link>
                <button type="button" onClick={signOut} className="flex min-h-12 items-center rounded-lg px-2 text-left text-lg font-semibold hover:bg-blush-200">
                  Sign out
                </button>
              </>
            ) : mode === "live" ? (
              <>
                <Link href="/login" className="flex min-h-12 items-center rounded-lg px-2 text-lg font-semibold hover:bg-blush-200">
                  Log in
                </Link>
                <Link href="/signup" className="flex min-h-12 items-center rounded-lg px-2 text-lg font-semibold hover:bg-blush-200">
                  Create a free account
                </Link>
              </>
            ) : (
              <Link href="/dashboard" className="flex min-h-12 items-center rounded-lg px-2 text-lg font-semibold hover:bg-blush-200">
                My gifts (demo)
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
