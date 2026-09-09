import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

/**
 * Researcher/admin authentication. Google sign-in is the real mechanism,
 * restricted to an explicit allowlist (`ADMIN_ALLOWED_EMAILS`) — Google
 * account existing is not enough, the email must be on the list.
 *
 * The Credentials provider below is a **test-only** bypass so Playwright
 * (and CI, which builds and runs a real production bundle) can exercise
 * the admin area without a live Google OAuth consent screen. It requires
 * *both* `ALLOW_ADMIN_TEST_LOGIN=true` and a matching
 * `E2E_ADMIN_TEST_SECRET` — deliberately not just `NODE_ENV`, since a
 * Vercel preview/production deployment is also built with
 * `NODE_ENV=production` and must not accidentally enable this. Never set
 * `ALLOW_ADMIN_TEST_LOGIN` in a real deployment's environment variables.
 */
function allowedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const testBypassSecret = process.env.E2E_ADMIN_TEST_SECRET;
const providers: NextAuthConfig["providers"] = [Google];

if (process.env.ALLOW_ADMIN_TEST_LOGIN === "true" && testBypassSecret) {
  providers.push(
    Credentials({
      id: "e2e-test-bypass",
      name: "E2E test login (ALLOW_ADMIN_TEST_LOGIN only)",
      credentials: {
        email: { label: "Email", type: "text" },
        secret: { label: "Secret", type: "password" },
      },
      authorize(credentials) {
        if (credentials?.secret !== testBypassSecret) return null;
        const email =
          typeof credentials?.email === "string" ? credentials.email : null;
        if (!email) return null;
        return { id: email, email };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ user }) {
      const email = user.email?.toLowerCase();
      return Boolean(email && allowedEmails().includes(email));
    },
  },
});
