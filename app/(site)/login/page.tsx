import type { Metadata } from "next";
import { AuthCard } from "@/components/forms/auth-card";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Log in to see and edit your gifts.">
      <LoginForm />
    </AuthCard>
  );
}
