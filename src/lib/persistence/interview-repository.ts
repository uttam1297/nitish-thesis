import type { InterviewState } from "@/domain/interview/types";

/** What gets handed off on final submission. */
export interface InterviewSubmission {
  questionnaireVersion: string;
  state: InterviewState;
  submittedAt: string;
}

/**
 * Where a finished interview goes. Phase 2 simulates this locally; Phase 3
 * can swap in a Supabase-backed implementation without the interview engine
 * or its screens changing.
 */
export interface InterviewRepository {
  submit(submission: InterviewSubmission): Promise<{ success: true }>;
}

const SUBMISSIONS_STORAGE_KEY = "nitish-thesis-interview:submissions:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

/** Simulates submission by appending to a local, non-authoritative log. */
export class LocalInterviewRepository implements InterviewRepository {
  async submit(submission: InterviewSubmission): Promise<{ success: true }> {
    if (isBrowser()) {
      try {
        const raw = window.localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
        const existing: InterviewSubmission[] = raw ? JSON.parse(raw) : [];
        window.localStorage.setItem(
          SUBMISSIONS_STORAGE_KEY,
          JSON.stringify([...existing, submission])
        );
      } catch {
        // Simulated persistence only; a failed write must not block the
        // participant from reaching the completion screen.
      }
    }
    return { success: true };
  }
}

export const interviewRepository: InterviewRepository =
  new LocalInterviewRepository();
