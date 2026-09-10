import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the request's auth cookies — used
 * only to check *who is signed in* (the researcher's own session), never
 * for research data access (that's the service-role client in
 * `server-client.ts`, which bypasses RLS deliberately and stays far away
 * from anything cookie/session-based).
 */
export async function createSupabaseServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies
            // (no response to attach them to) — the proxy below is what
            // actually refreshes the session cookie on navigation.
          }
        },
      },
    }
  );
}
