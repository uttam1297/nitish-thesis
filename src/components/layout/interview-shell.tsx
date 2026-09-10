import Image from "next/image";
import type { ReactNode } from "react";

import htwLogo from "@/assets/htw-logo.png";
import { DiscoveryLineArt } from "@/components/illustration/line-art";
import { Button } from "@/components/ui/button";
import { ResumeLinkNote } from "@/components/layout/resume-link-note";
import type { SyncStatus } from "@/features/interview/use-server-sync";

const SYNC_STATUS_LABEL: Record<SyncStatus, string | null> = {
  idle: null,
  saving: "Saving…",
  saved: "Saved",
  error: "Saved on this device · retrying",
};

interface InterviewShellProps {
  showUniversityLogo?: boolean;
  progress?: ReactNode;
  syncStatus?: SyncStatus;
  resumeLink?: string | null;
  otherTabWarning?: boolean;
  background?: ReactNode;
  children: ReactNode;
}

export function InterviewShell({
  showUniversityLogo = false,
  progress,
  syncStatus,
  resumeLink,
  otherTabWarning,
  background,
  children,
}: InterviewShellProps) {
  const syncLabel = syncStatus ? SYNC_STATUS_LABEL[syncStatus] : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {background}
      <DiscoveryLineArt
        aria-hidden="true"
        className={`pointer-events-none fixed -top-16 -left-24 hidden size-[34rem] text-primary/[0.035] lg:block ${background ? "opacity-0" : ""}`}
      />
      <DiscoveryLineArt
        aria-hidden="true"
        className={`pointer-events-none fixed -right-24 -bottom-16 hidden size-[34rem] rotate-180 text-primary/[0.035] lg:block ${background ? "opacity-0" : ""}`}
      />

      <a
        href="#interview-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to interview content
      </a>

      <header className="relative z-10 mx-auto w-full max-w-(--width-interview) px-4 pt-5 sm:px-6 sm:pt-7">
        <div className="flex min-h-8 items-center justify-between gap-4">
          {showUniversityLogo ? (
            <Image
              src={htwLogo}
              alt="HTW Berlin University of Applied Sciences"
              priority
              sizes="(min-width: 640px) 96px, 84px"
              className="h-auto w-21 sm:w-24"
            />
          ) : (
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Research interview
            </p>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            Confidential · voluntary
            {syncLabel && (
              <span role="status" aria-live="polite">
                · {syncLabel}
              </span>
            )}
          </p>
        </div>
        {progress && <div className="mt-5">{progress}</div>}
        {otherTabWarning && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm"
          >
            <span>
              Another open tab has saved newer progress on this interview.
            </span>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reload this tab
            </Button>
          </div>
        )}
      </header>

      <main
        id="interview-content"
        className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8"
      >
        <div className="w-full max-w-(--width-interview)">{children}</div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-(--width-interview) px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:px-6 sm:pb-7">
        Your answers are saved in this browser so you can stop and return.
        {resumeLink && <ResumeLinkNote resumeLink={resumeLink} />}
      </footer>
    </div>
  );
}
