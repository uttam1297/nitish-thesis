import { beforeEach, describe, expect, it } from "vitest";

import { QUESTIONNAIRE_VERSION } from "@/config/interview";
import { ConsentRepository } from "@/lib/supabase/consent-repository";
import { resetInMemoryDb } from "@/lib/supabase/in-memory-db";
import { ParticipantRepository } from "@/lib/supabase/participant-repository";
import { ResponseRepository } from "@/lib/supabase/response-repository";
import { responseRecordSchema } from "@/lib/supabase/records";
import { SessionRepository } from "@/lib/supabase/session-repository";
import { StudyRepository } from "@/lib/supabase/study-repository";
import { generateResumeToken } from "@/lib/supabase/resume-token";
import { withdrawSession } from "@/lib/supabase/withdrawal";

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

describe("StudyRepository", () => {
  it("resolves the active questionnaire version seeded for local dev", async () => {
    const { study } = makeRepositories();
    const version = await study.getActiveQuestionnaireVersion();
    expect(version.version).toBe(QUESTIONNAIRE_VERSION);
    expect(version.isActive).toBe(true);
  });
});

describe("ParticipantRepository", () => {
  it("creates a participant with a UUID and a sequential participant code", async () => {
    const { participants } = makeRepositories();
    const first = await participants.create({
      role: "Product Manager",
      industry: "Energy",
      experience: "6-10 years",
      closenessToDiscovery: "4",
    });
    expect(first.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(first.participantCode).toBe("P001");

    const second = await participants.create({
      role: "Engineer",
      industry: "Retail",
      experience: "1 year",
      closenessToDiscovery: "1",
    });
    expect(second.participantCode).toBe("P002");

    expect(await participants.listAll()).toHaveLength(2);
    expect((await participants.getById(first.id))?.role).toBe(
      "Product Manager"
    );
  });
});

async function seedSession() {
  const repos = makeRepositories();
  const questionnaireVersion =
    await repos.study.getActiveQuestionnaireVersion();
  const participant = await repos.participants.create({
    role: "PM",
    industry: "Retail",
    experience: "3 years",
    closenessToDiscovery: "5",
  });
  const { session, resumeToken } = await repos.sessions.create({
    participantId: participant.id,
    questionnaireVersionId: questionnaireVersion.id,
    questionnaireVersion: questionnaireVersion.version,
    responseMode: "asynchronous_form",
    firstQuestionId: "q5",
  });
  return { ...repos, participant, session, resumeToken, questionnaireVersion };
}

describe("SessionRepository", () => {
  it("creates a session and resolves it by resume token, not by id guessing", async () => {
    const { sessions, session, resumeToken } = await seedSession();

    const found = await sessions.findByResumeToken(resumeToken);
    expect(found?.id).toBe(session.id);

    const notFound = await sessions.findByResumeToken(generateResumeToken());
    expect(notFound).toBeNull();
  });

  it("reattaches to the same session on a retried create instead of duplicating it", async () => {
    const repos = makeRepositories();
    const questionnaireVersion =
      await repos.study.getActiveQuestionnaireVersion();
    const participant = await repos.participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const clientRequestId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

    const first = await repos.sessions.create({
      participantId: participant.id,
      questionnaireVersionId: questionnaireVersion.id,
      questionnaireVersion: questionnaireVersion.version,
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
      clientRequestId,
    });
    const retry = await repos.sessions.create({
      participantId: participant.id,
      questionnaireVersionId: questionnaireVersion.id,
      questionnaireVersion: questionnaireVersion.version,
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
      clientRequestId,
    });

    expect(retry.session.id).toBe(first.session.id);
    expect(await repos.sessions.listAll()).toHaveLength(1);
  });

  it("marks completion idempotently, so a retried submit is a no-op", async () => {
    const { sessions, session } = await seedSession();

    const firstCall = await sessions.markCompleted(session.id);
    expect(firstCall.alreadyCompleted).toBe(false);
    const secondCall = await sessions.markCompleted(session.id);
    expect(secondCall.alreadyCompleted).toBe(true);

    const all = await sessions.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("completed");
  });

  it("rotates the resume token and invalidates the previous one", async () => {
    const { sessions, session, resumeToken } = await seedSession();
    const rotated = await sessions.rotateResumeToken(session.id);

    expect(rotated).not.toBe(resumeToken);
    expect(await sessions.findByResumeToken(resumeToken)).toBeNull();
    expect((await sessions.findByResumeToken(rotated))?.id).toBe(session.id);
  });

  it("defaults to the pilot study stage unless STUDY_STAGE=main", async () => {
    const original = process.env.STUDY_STAGE;
    try {
      delete process.env.STUDY_STAGE;
      const { session: pilotSession } = await seedSession();
      expect(pilotSession.studyStage).toBe("pilot");

      process.env.STUDY_STAGE = "main";
      const { session: mainSession } = await seedSession();
      expect(mainSession.studyStage).toBe("main");
    } finally {
      if (original === undefined) delete process.env.STUDY_STAGE;
      else process.env.STUDY_STAGE = original;
    }
  });
});

describe("ResponseRepository", () => {
  it("upserts by (session, question): a second save updates, never duplicates", async () => {
    const { responses, session, participant } = await seedSession();

    const first = await responses.upsert({
      sessionId: session.id,
      participantId: participant.id,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: { kind: "text", text: "First draft" },
    });
    const second = await responses.upsert({
      sessionId: session.id,
      participantId: participant.id,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: { kind: "text", text: "Edited answer" },
    });

    expect(second.id).toBe(first.id);
    const all = await responses.listBySession(session.id);
    expect(all).toHaveLength(1);
    expect(all[0].responseValue).toEqual({
      kind: "text",
      text: "Edited answer",
    });
  });

  it("does not let one session's save touch another session's row", async () => {
    const seeded = await seedSession();
    await seeded.responses.upsert({
      sessionId: seeded.session.id,
      participantId: seeded.participant.id,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: { kind: "text", text: "Owner's answer" },
    });

    const questionnaireVersion = seeded.questionnaireVersion;
    const attackerParticipant = await seeded.participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const attackerSession = await seeded.sessions.create({
      participantId: attackerParticipant.id,
      questionnaireVersionId: questionnaireVersion.id,
      questionnaireVersion: questionnaireVersion.version,
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });

    await seeded.responses.upsert({
      sessionId: attackerSession.session.id,
      participantId: attackerParticipant.id,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: { kind: "text", text: "Different session's answer" },
    });

    const ownerRows = await seeded.responses.listBySession(seeded.session.id);
    expect(ownerRows).toHaveLength(1);
    expect(ownerRows[0].responseValue).toEqual({
      kind: "text",
      text: "Owner's answer",
    });
  });

  it("batches upsertMany in one call and dedupes within the batch too", async () => {
    const { responses, session, participant } = await seedSession();
    const results = await responses.upsertMany([
      {
        sessionId: session.id,
        participantId: participant.id,
        questionId: "q5",
        questionVersion: "1",
        construct: "discovery-behaviour",
        responseType: "voice_or_text",
        responseValue: { kind: "text", text: "A" },
      },
      {
        sessionId: session.id,
        participantId: participant.id,
        questionId: "q6",
        questionVersion: "1",
        construct: "journey-evidence",
        responseType: "voice_or_text",
        responseValue: { kind: "text", text: "B" },
      },
    ]);
    expect(results).toHaveLength(2);
    expect(await responses.listBySession(session.id)).toHaveLength(2);
  });

  it("rejects a response referencing an unknown question id", () => {
    expect(() =>
      responseRecordSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        sessionId: "22222222-2222-4222-8222-222222222222",
        participantId: "33333333-3333-4333-8333-333333333333",
        questionId: "not-a-real-question",
        questionVersion: "1",
        construct: "discovery-behaviour",
        responseType: "short_text",
        responseValue: { kind: "text", text: "x" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrow(/Unknown question id/);
  });
});

describe("ConsentRepository", () => {
  it("records voice-input and recording consent as independent flags", async () => {
    const { consent, session, participant } = await seedSession();
    await consent.record({
      sessionId: session.id,
      participantId: participant.id,
      consentVersion: "1.0.0",
      participationConsent: true,
      voiceInputConsent: true,
      recordingConsent: false,
    });

    const [record] = await consent.listBySession(session.id);
    expect(record.voiceInputConsent).toBe(true);
    expect(record.recordingConsent).toBe(false);
  });
});

describe("withdrawSession", () => {
  it("marks the session withdrawn and scrubs only its own responses", async () => {
    const seeded = await seedSession();
    await seeded.responses.upsert({
      sessionId: seeded.session.id,
      participantId: seeded.participant.id,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: { kind: "text", text: "Sensitive answer" },
    });

    const other = await seedSession();
    await other.responses.upsert({
      sessionId: other.session.id,
      participantId: other.participant.id,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: { kind: "text", text: "Untouched answer" },
    });

    const result = await withdrawSession(seeded, seeded.session.id);
    expect(result.scrubbedResponseCount).toBe(1);

    const withdrawn = await seeded.sessions.getById(seeded.session.id);
    expect(withdrawn?.status).toBe("withdrawn");

    const [scrubbed] = await seeded.responses.listBySession(seeded.session.id);
    expect(scrubbed.responseValue).toBe("[WITHDRAWN]");
  });
});
