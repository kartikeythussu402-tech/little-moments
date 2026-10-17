import type { Metadata } from "next";
import { AuthCard } from "@/components/forms/auth-card";
import { SignupForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create your free account" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your free account" subtitle="Save your gifts, edit them anytime, and open them from any device.">
      <SignupForm />
    </AuthCard>
  );
}
