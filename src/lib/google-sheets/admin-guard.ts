import "server-only";

import { auth } from "@/auth";
import { KnownApiError } from "@/lib/google-sheets/api-errors";

/**
 * Re-verifies the researcher session inside the Route Handler itself. The
 * `proxy.ts` redirect is only the optimistic, cookie-based check — this is
 * the secure check close to the data, per Next.js's auth guidance.
 */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new KnownApiError(401, "Authentication required.");
  }
  return session;
}
