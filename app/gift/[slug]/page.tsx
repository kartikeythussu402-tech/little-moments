import type { Metadata } from "next";
import { GiftRenderer } from "@/components/gift/gift-renderer";
import { isSupabaseConfigured } from "@/lib/config";
import { getPublishedGift } from "@/lib/published";
import { DemoGiftView } from "./demo-view";
import { Unavailable } from "./unavailable";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/gift/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const gift = isSupabaseConfigured ? await getPublishedGift(slug) : null;
  const name = gift?.config.recipientName.trim();
  const title = name ? `${name}, someone made you something` : "Someone made you something";
  return {
    title: { absolute: title },
    description: "Tap to open your Little Moment.",
    robots: { index: false, follow: false },
    openGraph: { title, description: "Tap to open your Little Moment.", type: "website" },
  };
}

export default async function GiftPage(props: PageProps<"/gift/[slug]">) {
  const { slug } = await props.params;
  if (!isSupabaseConfigured) return <DemoGiftView slug={slug} />;
  const gift = await getPublishedGift(slug);
  if (!gift) return <Unavailable />;
  return <GiftRenderer config={gift.config} photoUrls={gift.photoUrls} />;
}
