"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface WithdrawButtonProps {
  sessionId: string;
}

export function WithdrawButton({ sessionId }: WithdrawButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={async () => {
        if (
          !window.confirm(
            "Withdraw this participant's data? Their responses will be scrubbed and the session marked withdrawn. This cannot be undone."
          )
        ) {
          return;
        }
        setPending(true);
        try {
          await fetch(`/api/admin/sessions/${sessionId}/withdraw`, {
            method: "POST",
          });
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Withdrawing…" : "Withdraw participant"}
    </Button>
  );
}
