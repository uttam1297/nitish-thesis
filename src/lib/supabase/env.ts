import "server-only";

/**
 * Server-only Supabase configuration. The service-role key bypasses Row
 * Level Security entirely — it must never reach the browser bundle, be
 * logged, or be returned from an API response. Never import this module
 * from a Client Component; the `server-only` guard above throws at build
 * time if that happens.
 */
export interface SupabaseServerConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Returns `null` (rather than throwing) when credentials are absent, so
 * local development and tests can fall back to an in-memory repository
 * without every caller needing to catch a startup exception.
 */
export function readSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}
