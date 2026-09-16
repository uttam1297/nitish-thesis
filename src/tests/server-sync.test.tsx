import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewContextValue } from "@/features/interview/interview-provider";
import { useServerSync } from "@/features/interview/use-server-sync";
import {
  loadSessionIdentity,
  saveSessionIdentity,
} from "@/lib/persistence/session-identity-storage";

const submitServerSession = vi.hoisted(() => vi.fn());
const syncAnswers = vi.hoisted(() => vi.fn());
const createServerSession = vi.hoisted(() => vi.fn());

vi.mock("@/features/interview/server-sync-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/interview/server-sync-client")
  >("@/features/interview/server-sync-client");
  return {
    ...actual,
    createServerSession,
    syncAnswers,
    submitServerSession,
  };
});

const identity = {
  participantId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
  resumeToken: "token",
  syncedUpdatedAt: {},
};

/**
 * The hook only reads a handful of fields; a minimal stand-in keeps the
 * test about sync behaviour rather than about the interview engine.
 */
function contextValue(
  overrides: Partial<InterviewContextValue> = {}
): InterviewContextValue {
  return {
    questionnaire: { version: "1.5.0", sections: [], questions: [] },
    state: {
      status: "in_progress",
      currentStepId: "q5",
      consent: { granted: true, grantedAt: null, consentVersion: "1.0.0" },
      responses: {},
    },
    currentStep: { kind: "review", id: "review" },
    progress: { percent: 50 },
    startOverCount: 0,
    ...overrides,
  } as unknown as InterviewContextValue;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  syncAnswers.mockResolvedValue({ savedAt: "2026-09-16T12:00:00Z" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("starting over detaches the previous session", () => {
  it("drops the stored identity so answers cannot land on someone else's session", async () => {
    saveSessionIdentity(identity);
    const { rerender } = renderHook(
      ({ count }) =>
        useServerSync(contextValue({ startOverCount: count as number })),
      { initialProps: { count: 0 } }
    );

    expect(loadSessionIdentity()).not.toBeNull();

    rerender({ count: 1 });

    await waitFor(() => expect(loadSessionIdentity()).toBeNull());
  });

  it("keeps the identity while no one has started over", async () => {
    saveSessionIdentity(identity);
    const { rerender } = renderHook(
      ({ count }) =>
        useServerSync(contextValue({ startOverCount: count as number })),
      { initialProps: { count: 0 } }
    );

    rerender({ count: 0 });

    expect(loadSessionIdentity()).not.toBeNull();
  });
});

describe("final submit", () => {
  it("retries until the session is marked complete", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveSessionIdentity(identity);
    submitServerSession
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        success: true,
        alreadyCompleted: false,
        participantCode: "P020",
      });

    const submitted = contextValue({
      state: {
        ...contextValue().state,
        status: "submitted",
      },
    } as Partial<InterviewContextValue>);

    const { result } = renderHook(() => useServerSync(submitted));

    await waitFor(() => expect(submitServerSession).toHaveBeenCalledTimes(1));
    expect(result.current.participantCode).toBeNull();

    // Without the retry loop this participant would stay "in progress"
    // for good: nothing else re-fires the submit.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    await waitFor(() => expect(result.current.participantCode).toBe("P020"));
  });

  it("stops retrying once the submit succeeds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveSessionIdentity(identity);
    submitServerSession.mockResolvedValue({
      success: true,
      alreadyCompleted: false,
      participantCode: "P021",
    });

    const submitted = contextValue({
      state: { ...contextValue().state, status: "submitted" },
    } as Partial<InterviewContextValue>);

    const { result } = renderHook(() => useServerSync(submitted));

    await waitFor(() => expect(result.current.participantCode).toBe("P021"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(24000);
    });

    expect(submitServerSession).toHaveBeenCalledTimes(1);
  });
});
