import type { Metadata } from "next";
import Link from "next/link";
import { GiftRenderer } from "@/components/gift/gift-renderer";
import { SAMPLE_GIFT } from "@/lib/sample";

export const metadata: Metadata = { title: "See what they'll receive", description: "An example Little Moments gift: a sealed letter, a virtual bouquet and a few reasons why." };

export default function ExamplePage() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-3 bg-ink px-4 py-2 text-sm text-white">
        <span>This is an example gift with made-up names.</span>
        <Link href="/create" className="font-semibold text-marigold underline underline-offset-4">
          Make your own
        </Link>
      </div>
      <div className="pt-10">
        <GiftRenderer config={SAMPLE_GIFT} />
      </div>
    </>
  );
}
