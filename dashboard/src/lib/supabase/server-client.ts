import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getDashboardDatabaseConfig } from "@/lib/config/dashboard-config";

let client: SupabaseClient | undefined;

export function getDashboardSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = getDashboardDatabaseConfig();
    client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return client;
}
