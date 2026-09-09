/**
 * Client-side cache of Phase 3 server identity: which session this browser
 * is attached to, its resume token, and the Sheets row number already
 * allocated to each answered question. Kept separate from the Phase 2
 * `InterviewDraft` (interview domain state) — this is sync-protocol
 * metadata, not a participant answer.
 */
export interface SessionIdentity {
  participantId: string;
  sessionId: string;
  sessionRowRef: number;
  resumeToken: string;
  /** questionId -> the Sheets row its response was last saved to. */
  rowRefs: Record<string, number>;
  /** questionId -> the response's `updatedAt` last successfully synced. */
  syncedUpdatedAt: Record<string, string>;
}

const KEY = "nitish-thesis-interview:session-identity:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function loadSessionIdentity(): SessionIdentity | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionIdentity) : null;
  } catch {
    return null;
  }
}

export function saveSessionIdentity(identity: SessionIdentity): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    // Best-effort: losing this cache only costs a few extra row lookups.
  }
}

export function clearSessionIdentity(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Best-effort, see saveSessionIdentity().
  }
}
