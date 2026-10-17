import type { Metadata } from "next";
import { AuthCard } from "@/components/forms/auth-card";
import { ResetForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthCard title="Set a new password">
      <ResetForm />
    </AuthCard>
  );
}
