import type { Metadata } from "next";
import { AccountSettings } from "./account-settings";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="container-page max-w-2xl py-10 sm:py-14">
      <p className="eyebrow">Settings</p>
      <h1 className="display mb-8 mt-2 text-4xl text-ink">Your account</h1>
      <AccountSettings />
    </div>
  );
}
