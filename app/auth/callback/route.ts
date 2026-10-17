import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/schemas";
import { supabaseServer } from "@/lib/supabase/server";

/** Handles email-verification and password-recovery links from Supabase. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await supabaseServer();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  if (!ok) return NextResponse.redirect(new URL("/login?error=link", url.origin));
  if (type === "recovery") return NextResponse.redirect(new URL("/reset-password", url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
