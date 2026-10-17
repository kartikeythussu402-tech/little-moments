import type { Metadata } from "next";
import { AuthCard } from "@/components/forms/auth-card";
import { ForgotForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to set a new one.">
      <ForgotForm />
    </AuthCard>
  );
}
