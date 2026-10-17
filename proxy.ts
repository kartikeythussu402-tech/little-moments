import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Refreshes the Supabase session cookie on navigation (Next.js 16 proxy convention). */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project-ref")) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([k, v]) => response.headers.set(k, String(v)));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip static assets and the public gift pages (recipients never need a session).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|gift/|api/sync/|.*\\.(?:svg|png|jpg|jpeg|webp|woff2?)$).*)"],
};
