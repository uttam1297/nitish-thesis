import type { InterviewState } from "@/domain/interview/types";

/**
 * A saved-in-progress interview. Serialisable so it can be persisted to
 * `localStorage` today and, in Phase 3, sent to a server without the
 * interview engine changing shape.
 */
export interface InterviewDraft {
  questionnaireVersion: string;
  state: InterviewState;
  savedAt: string;
}

/**
 * Local draft persistence, independent of *where* the draft eventually goes.
 * Phase 3 can add a server-backed implementation of this same interface.
 */
export interface DraftStorage {
  load(): InterviewDraft | null;
  save(draft: InterviewDraft): void;
  clear(): void;
}

const DRAFT_STORAGE_KEY = "nitish-thesis-interview:draft:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

export class LocalStorageDraftStorage implements DraftStorage {
  constructor(private readonly key: string = DRAFT_STORAGE_KEY) {}

  load(): InterviewDraft | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw) as InterviewDraft;
    } catch {
      return null;
    }
  }

  save(draft: InterviewDraft): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(draft));
    } catch {
      // Storage can be full or blocked (private browsing); autosave is a
      // convenience, so a failed write must never interrupt the interview.
    }
  }

  clear(): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // See save(): clearing is best-effort.
    }
  }
}

export const draftStorage: DraftStorage = new LocalStorageDraftStorage();
