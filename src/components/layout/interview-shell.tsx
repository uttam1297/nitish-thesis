import type { ReactNode } from "react";

interface InterviewShellProps {
  progress?: ReactNode;
  children: ReactNode;
}

export function InterviewShell({ progress, children }: InterviewShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#interview-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to interview content
      </a>

      <header className="mx-auto w-full max-w-(--width-interview) px-4 pt-5 sm:px-6 sm:pt-7">
        <div className="flex min-h-8 items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Research interview
          </p>
          <p className="text-xs text-muted-foreground">Anonymous · voluntary</p>
        </div>
        {progress && <div className="mt-5">{progress}</div>}
      </header>

      <main
        id="interview-content"
        className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      >
        <div className="w-full max-w-(--width-interview)">{children}</div>
      </main>

      <footer className="mx-auto w-full max-w-(--width-interview) px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:px-6 sm:pb-7">
        Your answers are saved in this browser so you can stop and return.
      </footer>
    </div>
  );
}
