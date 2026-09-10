"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client, for the admin login form only. Uses the
 * publishable/anon key — safe to expose, it has no access to anything
 * (RLS denies the `anon`/`authenticated` roles entirely, see the
 * migration). This client's only job is exchanging researcher
 * credentials for a session cookie via Supabase Auth.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
