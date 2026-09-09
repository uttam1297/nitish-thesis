import { beforeEach, describe, expect, it } from "vitest";

import { questionnaire } from "@/config/interview";
import { createInitialState } from "@/domain/interview/reducer";
import { LocalStorageDraftStorage } from "@/lib/persistence/draft-storage";
import { LocalInterviewRepository } from "@/lib/persistence/interview-repository";

describe("LocalStorageDraftStorage", () => {
  beforeEach(() => window.localStorage.clear());

  it("returns null when nothing has been saved", () => {
    const storage = new LocalStorageDraftStorage("test:draft");
    expect(storage.load()).toBeNull();
  });

  it("round-trips a saved draft", () => {
    const storage = new LocalStorageDraftStorage("test:draft");
    const state = {
      ...createInitialState(questionnaire),
      currentStepId: "q3",
    };
    storage.save({
      questionnaireVersion: questionnaire.version,
      state,
      savedAt: "2026-01-01T00:00:00.000Z",
    });

    const loaded = storage.load();
    expect(loaded?.state.currentStepId).toBe("q3");
    expect(loaded?.questionnaireVersion).toBe(questionnaire.version);
  });

  it("clears a saved draft", () => {
    const storage = new LocalStorageDraftStorage("test:draft");
    storage.save({
      questionnaireVersion: questionnaire.version,
      state: createInitialState(questionnaire),
      savedAt: "2026-01-01T00:00:00.000Z",
    });
    storage.clear();
    expect(storage.load()).toBeNull();
  });

  it("does not throw on corrupted storage", () => {
    const storage = new LocalStorageDraftStorage("test:draft:corrupt");
    window.localStorage.setItem("test:draft:corrupt", "{not json");
    expect(storage.load()).toBeNull();
  });
});

describe("LocalInterviewRepository", () => {
  beforeEach(() => window.localStorage.clear());

  it("simulates a successful submission without a backend", async () => {
    const repository = new LocalInterviewRepository();
    const state = createInitialState(questionnaire);
    const result = await repository.submit({
      questionnaireVersion: questionnaire.version,
      state,
      submittedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result).toEqual({ success: true });
  });
});
