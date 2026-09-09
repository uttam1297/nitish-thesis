import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

// Must read ALLOW_ADMIN_TEST_LOGIN at request time, not bake it in as a
// static page at build time (the build environment is not the runtime
// environment — see README "Vercel deployment").
export const dynamic = "force-dynamic";

/**
 * The Google button is the real path. The plain-text form below only
 * renders when explicitly opted into via `ALLOW_ADMIN_TEST_LOGIN=true`
 * (see `src/auth.ts`) — it exists so Playwright/CI can exercise `/admin`
 * without a live Google OAuth consent screen, and must never be set in a
 * real deployment's environment variables.
 */
export default function AdminLoginPage() {
  const devBypassEnabled =
    process.env.ALLOW_ADMIN_TEST_LOGIN === "true" &&
    Boolean(process.env.E2E_ADMIN_TEST_SECRET);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Surface className="grid w-full max-w-sm gap-6 p-6">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-semibold">Researcher sign-in</h1>
          <p className="text-sm text-muted-foreground">
            Restricted to allowlisted researcher accounts.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin" });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>

        {devBypassEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("e2e-test-bypass", {
                email: formData.get("email"),
                secret: formData.get("secret"),
                redirectTo: "/admin",
              });
            }}
            className="grid gap-2 border-t pt-4"
          >
            <p className="text-xs text-muted-foreground">Test login</p>
            <input
              name="email"
              type="email"
              placeholder="researcher@example.com"
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              name="secret"
              type="password"
              placeholder="Test secret"
              required
              className="rounded-md border px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary">
              Test sign-in
            </Button>
          </form>
        )}
      </Surface>
    </main>
  );
}
