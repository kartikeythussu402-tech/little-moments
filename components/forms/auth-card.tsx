import { Suspense } from "react";
import { LogoMark } from "@/components/site/logo";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-9">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark size={42} />
          <h1 className="display text-3xl text-ink">{title}</h1>
          {subtitle && <p className="text-ink-soft">{subtitle}</p>}
        </div>
        <Suspense fallback={<div className="h-64" aria-hidden="true" />}>{children}</Suspense>
      </div>
    </div>
  );
}
