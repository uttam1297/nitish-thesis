import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";

import {
  InterviewProvider,
  useInterview,
} from "@/features/interview/interview-provider";
import {
  DRAFT_STORAGE_KEY,
  LocalStorageDraftStorage,
} from "@/lib/persistence/draft-storage";
import { LocalInterviewRepository } from "@/lib/persistence/interview-repository";

function Harness() {
  const interview = useInterview();
  return (
    <div>
      <p data-testid="step">{interview.state.currentStepId}</p>
      <p data-testid="resumable">{String(interview.hasResumableDraft)}</p>
      <p data-testid="other-tab">
        {String(interview.otherTabHasNewerProgress)}
      </p>
      <p data-testid="q2">
        {interview.state.responses.q2?.value?.kind === "text"
          ? interview.state.responses.q2.value.text
          : ""}
      </p>
      <button onClick={() => interview.goToStep("q2")}>go-to-q2</button>
      <button
        onClick={() =>
          interview.answer(
            interview.questionnaire.questions.find((q) => q.id === "q2")!,
            { kind: "text", text: "Retail" },
            "typed"
          )
        }
      >
        answer-q2
      </button>
      <button onClick={interview.resumeDraft}>resume</button>
      <button onClick={interview.startOver}>start-over</button>
    </div>
  );
}

describe("InterviewProvider persistence", () => {
  let storage: LocalStorageDraftStorage;
  let repository: LocalInterviewRepository;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new LocalStorageDraftStorage("test:provider:draft");
    repository = new LocalInterviewRepository();
  });

  it("autosaves progress and resumes it in a fresh provider instance", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <InterviewProvider
        draftStorage={storage}
        interviewRepository={repository}
        autosaveDelayMs={0}
      >
        <Harness />
      </InterviewProvider>
    );

    await user.click(screen.getByText("go-to-q2"));
    await user.click(screen.getByText("answer-q2"));

    await waitFor(() => expect(storage.load()).not.toBeNull());
    unmount();

    render(
      <InterviewProvider
        draftStorage={storage}
        interviewRepository={repository}
        autosaveDelayMs={0}
      >
        <Harness />
      </InterviewProvider>
    );

    expect(screen.getByTestId("resumable")).toHaveTextContent("true");
    expect(screen.getByTestId("step")).toHaveTextContent("welcome");

    await user.click(screen.getByText("resume"));
    expect(screen.getByTestId("step")).toHaveTextContent("q2");
    expect(screen.getByTestId("q2")).toHaveTextContent("Retail");
  });

  it("start over discards the saved draft instead of resuming it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <InterviewProvider
        draftStorage={storage}
        interviewRepository={repository}
        autosaveDelayMs={0}
      >
        <Harness />
      </InterviewProvider>
    );
    await user.click(screen.getByText("go-to-q2"));
    await waitFor(() => expect(storage.load()).not.toBeNull());
    unmount();

    render(
      <InterviewProvider
        draftStorage={storage}
        interviewRepository={repository}
        autosaveDelayMs={0}
      >
        <Harness />
      </InterviewProvider>
    );
    expect(screen.getByTestId("resumable")).toHaveTextContent("true");

    await user.click(screen.getByText("start-over"));
    expect(screen.getByTestId("resumable")).toHaveTextContent("false");
    expect(storage.load()).toBeNull();
  });

  it("warns when another tab writes a newer draft for the same key", async () => {
    // The real draft storage key is used deliberately here: the provider
    // listens on that exact key, not on whatever custom key a test
    // instance of DraftStorage was given.
    render(
      <InterviewProvider interviewRepository={repository} autosaveDelayMs={0}>
        <Harness />
      </InterviewProvider>
    );
    expect(screen.getByTestId("other-tab")).toHaveTextContent("false");

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: DRAFT_STORAGE_KEY,
        newValue: JSON.stringify({ questionnaireVersion: "x" }),
      })
    );

    await waitFor(() =>
      expect(screen.getByTestId("other-tab")).toHaveTextContent("true")
    );
  });
});
