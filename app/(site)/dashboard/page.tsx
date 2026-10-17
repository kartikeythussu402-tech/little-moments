import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "My gifts", robots: { index: false } };

export default function DashboardPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="display mt-2 text-4xl text-ink">My gifts</h1>
        </div>
        <Link href="/create" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" /> New gift
        </Link>
      </div>
      <Dashboard />
    </div>
  );
}
