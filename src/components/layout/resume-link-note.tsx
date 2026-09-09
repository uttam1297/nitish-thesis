"use client";

import { useState } from "react";

interface ResumeLinkNoteProps {
  resumeLink: string;
}

/** Lets a participant grab a cross-device resume link without any account. */
export function ResumeLinkNote({ resumeLink }: ResumeLinkNoteProps) {
  const [copied, setCopied] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      · On another device?{" "}
      <button
        type="button"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(resumeLink);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard access can be blocked; the participant can still
            // select and copy the link manually from browser history.
          }
        }}
      >
        {copied ? "Link copied" : "Copy resume link"}
      </button>
    </span>
  );
}
