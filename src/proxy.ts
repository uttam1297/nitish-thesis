import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * Gates `/admin/**` on an authenticated, allowlisted researcher session.
 * This is the optimistic check (cookie-based, per Next.js's auth guide);
 * every admin Route Handler also re-verifies the session itself before
 * touching Google Sheets — see `src/lib/google-sheets/admin-guard.ts`.
 */
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (pathname.startsWith("/admin") && !isLoginPage && !request.auth) {
    return NextResponse.redirect(new URL("/admin/login", request.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
