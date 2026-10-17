import type { Metadata, Viewport } from "next";
import "@fontsource/young-serif/400.css";
import "@fontsource-variable/figtree/wght.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { BRAND, isSupabaseConfigured, siteUrl } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Little Moments — personal letters, virtual bouquets & digital gifts", template: "%s · Little Moments" },
  description: "Write a heartfelt letter, build a virtual bouquet or make a little interactive surprise — then share it on WhatsApp in one tap. Free to start.",
  applicationName: BRAND.name,
  icons: { icon: "/icon.svg" },
  openGraph: { siteName: BRAND.name, type: "website", locale: "en_IN" },
};

export const viewport: Viewport = {
  themeColor: "#fcf0f3",
  width: "device-width",
  initialScale: 1,
};

async function initialUser() {
  if (!isSupabaseConfigured) return null;
  const { getSessionUser } = await import("@/lib/supabase/server");
  return (await getSessionUser()).user;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await initialUser();
  return (
    <html lang="en-IN">
      <body className="flex min-h-svh flex-col">
        <AuthProvider initialUser={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
