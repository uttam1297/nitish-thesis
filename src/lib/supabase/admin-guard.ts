import "server-only";

import { KnownApiError } from "@/lib/supabase/api-errors";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth-client";

function allowedEmails(): string[] | null {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return null; // Not configured: any authenticated user is trusted.
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Re-verifies the researcher session inside the Route Handler itself —
 * the `proxy.ts` redirect is only the optimistic, cookie-based check;
 * this is the secure check close to the data. Public sign-up is expected
 * to be disabled in the Supabase project (dashboard setting), so any
 * authenticated user is the researcher by construction; `ADMIN_ALLOWED_EMAILS`
 * is an optional extra allowlist for defense-in-depth if sign-up is ever
 * left open.
 */
export async function requireAdminSession() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new KnownApiError(401, "Authentication required.");
  }

  const allowlist = allowedEmails();
  if (allowlist && !allowlist.includes(user.email.toLowerCase())) {
    throw new KnownApiError(403, "This account is not authorized.");
  }

  return user;
}
