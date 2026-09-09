import "server-only";

import { GoogleSheetsClient } from "@/lib/google-sheets/google-sheets-client";
import { readGoogleSheetsCredentials } from "@/lib/google-sheets/env";
import { InMemorySheetsClient } from "@/lib/google-sheets/in-memory-sheets-client";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

/**
 * Each Route Handler can be bundled into its own server chunk, so a
 * module-level `let` here would give every route its own instance instead
 * of one shared client — the in-memory fallback would then look like it
 * "forgets" data between an interview route and an admin route. Stashing
 * it on `globalThis` (the standard fix for this class of Next.js
 * singleton, same as the usual Prisma-client pattern) keeps it one
 * instance per server process regardless of bundling.
 */
const globalForSheets = globalThis as unknown as {
  __sheetsClient?: SheetsClient;
  __sheetsClientIsFallback?: boolean;
};

/**
 * Returns the process-wide Sheets client, real credentials permitting.
 *
 * Falls back to an in-memory client (data lost on restart) when
 * `GOOGLE_*` variables are absent, so `npm run dev` and CI work without a
 * real spreadsheet. This is intentional for a thesis-scale local/dev loop
 * — production deployments must set the real credentials.
 */
export function getSheetsClient(): SheetsClient {
  if (globalForSheets.__sheetsClient) return globalForSheets.__sheetsClient;

  const credentials = readGoogleSheetsCredentials();
  if (credentials) {
    globalForSheets.__sheetsClient = new GoogleSheetsClient(credentials);
    globalForSheets.__sheetsClientIsFallback = false;
  } else {
    globalForSheets.__sheetsClient = new InMemorySheetsClient();
    globalForSheets.__sheetsClientIsFallback = true;
    console.warn(
      "[google-sheets] GOOGLE_* environment variables are not set; using an in-memory Sheets client. Research data will NOT be persisted."
    );
  }
  return globalForSheets.__sheetsClient;
}

export function isUsingInMemoryFallback(): boolean {
  return Boolean(globalForSheets.__sheetsClientIsFallback);
}

/** Test-only: force a fresh client (and fallback flag) on the next call. */
export function resetSheetsClientForTests(): void {
  globalForSheets.__sheetsClient = undefined;
  globalForSheets.__sheetsClientIsFallback = false;
}
