import { defineConfig, devices } from "@playwright/test";

const port = 3127;
const baseURL = `http://127.0.0.1:${port}`;

/**
 * The project URL and anon/publishable key are meant to be public (RLS
 * denies the anon role everything — see the migration) — safe to bake
 * into the e2e config. `SUPABASE_SERVICE_ROLE_KEY` is deliberately left
 * unset here: without it, every repository falls back to an in-memory
 * store (see `src/lib/supabase/server-client.ts`), so e2e runs never
 * touch the real research database.
 */
const SUPABASE_URL = "https://kelsktxbdhhmrkvmoyam.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hJojVi2w7D5SpYaalN9RzQ_CAAU0xNj";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      // SUPABASE_SERVICE_ROLE_KEY intentionally unset — see comment above.
    },
  },
});
