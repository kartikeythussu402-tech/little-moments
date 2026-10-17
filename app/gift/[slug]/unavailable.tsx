import Link from "next/link";
import { LogoMark } from "@/components/site/logo";

export function Unavailable({ demo = false }: { demo?: boolean }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark size={48} />
      <h1 className="display text-3xl text-ink sm:text-4xl">This moment isn&apos;t available</h1>
      <p className="max-w-md text-lg leading-relaxed text-ink-soft">
        {demo
          ? "This is demo mode, so gifts only open in the browser that made them. Ask the sender to share again once Little Moments is fully set up."
          : "The link may have been switched off by the sender, or it might be mistyped. If someone sent it to you, ask them to check the link."}
      </p>
      <Link href="/" className="btn btn-primary">
        Visit Little Moments
      </Link>
    </main>
  );
}
