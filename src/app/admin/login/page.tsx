"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

/**
 * Email/password sign-in via Supabase Auth. Public sign-up is expected to
 * be disabled in the Supabase project (dashboard setting) — the one
 * researcher account is created manually there (or via the Supabase CLI),
 * so a successful sign-in here already implies "is the researcher". See
 * `admin-guard.ts` for the optional extra email allowlist.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Surface className="grid w-full max-w-sm gap-6 p-6">
        <div className="grid gap-1 text-center">
          <h1 className="text-xl font-semibold">Researcher sign-in</h1>
          <p className="text-sm text-muted-foreground">
            Restricted to the researcher account for this study.
          </p>
        </div>

        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            try {
              const supabase = createSupabaseBrowserClient();
              const { error: signInError } =
                await supabase.auth.signInWithPassword({ email, password });
              if (signInError) throw new Error(signInError.message);
              router.replace("/admin");
              router.refresh();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? "Invalid email or password."
                  : "Something went wrong."
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Surface>
    </main>
  );
}
