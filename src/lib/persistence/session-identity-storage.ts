/**
 * Client-side cache of the server session identity: which session this
 * browser is attached to and its resume token. Kept separate from the
 * `InterviewDraft` (interview domain state) — this is sync-protocol
 * metadata, not a participant answer.
 */
export interface SessionIdentity {
  participantId: string;
  sessionId: string;
  resumeToken: string;
  /**
   * questionId -> the response's `updatedAt` last successfully synced —
   * only the changed answers need resending on the next sync.
   */
  syncedUpdatedAt: Record<string, string>;
}

const KEY = "nitish-thesis-interview:session-identity:v1";
const PENDING_CREATION_KEY =
  "nitish-thesis-interview:pending-session-request-id:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

/**
 * The idempotency key for "start a session", generated and persisted
 * *before* the create request fires. If the browser is closed or the
 * response is lost before `saveSessionIdentity` runs, the next attempt
 * reuses the same id — see `createServerSession`'s server-side handling —
 * so a retry reattaches to the original session instead of creating a
 * duplicate one.
 */
export function loadOrCreatePendingSessionRequestId(): string {
  if (!isBrowser()) return crypto.randomUUID();
  try {
    const existing = window.localStorage.getItem(PENDING_CREATION_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(PENDING_CREATION_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearPendingSessionRequestId(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PENDING_CREATION_KEY);
  } catch {
    // Best-effort; a leftover key just gets reused (safely) next time.
  }
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
