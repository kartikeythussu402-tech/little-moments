import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[50svh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="hand text-3xl text-berry">oops</p>
      <h1 className="display text-4xl">We couldn&apos;t find that page</h1>
      <p className="text-ink-soft">It may have moved, or the link might be mistyped.</p>
      <Link href="/" className="btn btn-primary">Back home</Link>
    </div>
  );
}
