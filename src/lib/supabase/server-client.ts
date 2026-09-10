import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseServerConfig } from "@/lib/supabase/env";

/**
 * Stashed on `globalThis` rather than a module-level `let`: Next.js can
 * bundle each Route Handler into its own server chunk, which would give
 * every route its own "singleton" instead of one shared client per
 * process. This is the same fix the Google Sheets backend needed for its
 * client-factory — see git history for the production bug that taught us
 * that the hard way.
 */
const globalForSupabase = globalThis as unknown as {
  __supabaseServiceClient?: SupabaseClient;
  __supabaseIsFallback?: boolean;
};

/**
 * Service-role client: bypasses Row Level Security entirely. Only ever
 * constructed on the server, only ever used from Route Handlers/server
 * code, never sent to the browser. When credentials are absent, falls
 * back to an in-memory repository set (see `repositories.ts`) so local
 * dev and CI work without a real Supabase project.
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (globalForSupabase.__supabaseServiceClient) {
    return globalForSupabase.__supabaseServiceClient;
  }

  const config = readSupabaseServerConfig();
  if (!config) {
    if (!globalForSupabase.__supabaseIsFallback) {
      globalForSupabase.__supabaseIsFallback = true;
      console.warn(
        "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set; using an in-memory repository. Research data will NOT be persisted."
      );
    }
    return null;
  }

  globalForSupabase.__supabaseServiceClient = createClient(
    config.url,
    config.serviceRoleKey,
    { auth: { persistSession: false } }
  );
  return globalForSupabase.__supabaseServiceClient;
}

export function isUsingInMemoryFallback(): boolean {
  return getSupabaseServiceClient() === null;
}

/** Test-only: force a fresh client (and fallback flag) on the next call. */
export function resetSupabaseClientForTests(): void {
  globalForSupabase.__supabaseServiceClient = undefined;
  globalForSupabase.__supabaseIsFallback = false;
}
