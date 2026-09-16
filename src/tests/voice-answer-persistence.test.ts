import { beforeEach, describe, expect, it } from "vitest";

import { questionnaire } from "@/config/interview";
import {
  interviewReducer,
  createInitialState,
} from "@/domain/interview/reducer";
import { appendTranscript } from "@/features/voice/transcript";
import { syncRequestSchema } from "@/lib/supabase/api-schemas";
import { buildExportRows } from "@/lib/supabase/export-data";
import { resetInMemoryDb } from "@/lib/supabase/in-memory-db";
import { ConsentRepository } from "@/lib/supabase/consent-repository";
import { ParticipantRepository } from "@/lib/supabase/participant-repository";
import { ResponseRepository } from "@/lib/supabase/response-repository";
import { SessionRepository } from "@/lib/supabase/session-repository";
import { StudyRepository } from "@/lib/supabase/study-repository";

/**
 * A spoken answer must reach storage byte-for-byte identical to what the
 * participant saw in the textarea. Voice deliberately has no persistence path
 * of its own — it writes into the same answer state typing does — and this
 * test pins that: transcript merge → reducer → sync payload → API schema →
 * repository → export.
 */

const question = questionnaire.questions.find(
  (item) => item.id === "q5" && item.responseType === "voice_or_text"
)!;

function makeRepositories() {
  return {
    participants: new ParticipantRepository(null),
    sessions: new SessionRepository(null),
    responses: new ResponseRepository(null),
    consent: new ConsentRepository(null),
    study: new StudyRepository(null),
  };
}

beforeEach(() => {
  resetInMemoryDb();
});

describe("a spoken answer reaching the database", () => {
  it("stores the merged transcript verbatim and exports it unchanged", async () => {
    // What the participant ends up with: one typed sentence, two spoken
    // segments appended to it, exactly as the field would build it.
    const typed = "I work mostly on acquisition.";
    const afterFirst = appendTranscript(
      typed,
      "We saw a 30% drop in organic discovery — mainly in the DACH market."
    );
    const answerText = appendTranscript(
      afterFirst,
      "Karl's team calls it the ChatGPT effect."
    );

    let state = createInitialState(questionnaire);
    state = interviewReducer(
      state,
      {
        type: "answer",
        questionId: question.id,
        value: { kind: "text", text: answerText },
        method: "voice",
      },
      questionnaire
    );

    const stored = state.responses[question.id];
    expect(stored.value).toEqual({ kind: "text", text: answerText });

    const repositories = makeRepositories();
    const version = await repositories.study.getActiveQuestionnaireVersion();
    const participant = await repositories.participants.create({
      role: "Product / Product Management",
      industry: "Retail / E-commerce",
      experience: "3-6",
      closenessToDiscovery: "3",
    });
    const { session, resumeToken } = await repositories.sessions.create({
      participantId: participant.id,
      questionnaireVersionId: version.id,
      questionnaireVersion: version.version,
      responseMode: "asynchronous_form",
      firstQuestionId: question.id,
    });

    // Exactly the payload use-server-sync builds, parsed by the same schema
    // the route handler uses before anything is written.
    const body = syncRequestSchema.parse({
      sessionId: session.id,
      resumeToken,
      currentQuestionId: question.id,
      progressPercentage: 40,
      answers: [
        {
          questionId: question.id,
          questionVersion: "1",
          construct: question.construct,
          responseType: question.responseType,
          responseValue: JSON.stringify(stored.value),
        },
      ],
    });

    await repositories.responses.upsertMany(
      body.answers.map((answer) => ({
        sessionId: session.id,
        participantId: session.participantId,
        questionId: answer.questionId,
        questionVersion: answer.questionVersion,
        construct: answer.construct,
        responseType: answer.responseType,
        responseValue: JSON.parse(answer.responseValue),
        optionalElaboration: answer.optionalElaboration,
      }))
    );
    await repositories.sessions.markCompleted(session.id);

    const [saved] = await repositories.responses.listBySession(session.id);
    expect(saved.responseValue).toEqual({ kind: "text", text: answerText });

    const rows = await buildExportRows(repositories);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].responseValue).text).toBe(answerText);
    // Punctuation, casing, percentages, apostrophes and an em dash all
    // survive the JSON round trip rather than being normalised somewhere.
    expect(rows[0].responseValue).toContain("30%");
    expect(rows[0].responseValue).toContain("Karl's");
    expect(rows[0].sessionStatus).toBe("completed");
    expect(rows[0].participantCode).toBe(participant.participantCode);
  });

  it("keeps the last edit when a participant corrects a transcript before submitting", async () => {
    let state = createInitialState(questionnaire);
    state = interviewReducer(
      state,
      {
        type: "answer",
        questionId: question.id,
        value: { kind: "text", text: "Spoken draft with a wrong name." },
        method: "voice",
      },
      questionnaire
    );
    state = interviewReducer(
      state,
      {
        type: "answer",
        questionId: question.id,
        value: { kind: "text", text: "Spoken draft with the right name." },
        method: "voice_edited",
      },
      questionnaire
    );

    const repositories = makeRepositories();
    const version = await repositories.study.getActiveQuestionnaireVersion();
    const participant = await repositories.participants.create({
      role: "Product / Product Management",
      industry: "Retail / E-commerce",
      experience: "3-6",
      closenessToDiscovery: "3",
    });
    const { session } = await repositories.sessions.create({
      participantId: participant.id,
      questionnaireVersionId: version.id,
      questionnaireVersion: version.version,
      responseMode: "asynchronous_form",
      firstQuestionId: question.id,
    });

    // Both syncs upsert the same (session, question) pair, so the correction
    // replaces the draft instead of adding a second row.
    for (const text of [
      "Spoken draft with a wrong name.",
      "Spoken draft with the right name.",
    ]) {
      await repositories.responses.upsert({
        sessionId: session.id,
        participantId: session.participantId,
        questionId: question.id,
        questionVersion: "1",
        construct: question.construct,
        responseType: question.responseType,
        responseValue: { kind: "text", text },
      });
    }

    const saved = await repositories.responses.listBySession(session.id);
    expect(saved).toHaveLength(1);
    expect(saved[0].responseValue).toEqual({
      kind: "text",
      text: "Spoken draft with the right name.",
    });
  });
});
