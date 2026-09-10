import { beforeEach, describe, expect, it } from "vitest";

import { ConsentRepository } from "@/lib/google-sheets/consent-repository";
import { ParticipantRepository } from "@/lib/google-sheets/participant-repository";
import { ResearchMetadataRepository } from "@/lib/google-sheets/research-metadata-repository";
import { ResponseRepository } from "@/lib/google-sheets/response-repository";
import { responseRecordSchema } from "@/lib/google-sheets/records";
import { SessionRepository } from "@/lib/google-sheets/session-repository";
import { generateResumeToken } from "@/lib/google-sheets/resume-token";
import { withdrawSession } from "@/lib/google-sheets/withdrawal";
import { StrictSheetsClient } from "@/tests/stubs/strict-sheets-client";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

function makeRepositories() {
  // Not the lenient InMemorySheetsClient: this one throws exactly like the
  // real Sheets API does when a sheet is read/written before `ensureSheet`
  // — see its class doc for the production bug this caught.
  const client: SheetsClient = new StrictSheetsClient();
  return {
    client,
    participants: new ParticipantRepository(client),
    sessions: new SessionRepository(client),
    responses: new ResponseRepository(client),
    consent: new ConsentRepository(client),
    researchMetadata: new ResearchMetadataRepository(client),
  };
}

describe("ParticipantRepository", () => {
  it("creates a participant with a UUID, not a guessable id", async () => {
    const { participants } = makeRepositories();
    const record = await participants.create({
      role: "Product Manager",
      industry: "Energy",
      experience: "6-10 years",
      closenessToDiscovery: "4",
    });
    expect(record.participantId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(await participants.listAll()).toHaveLength(1);
  });
});

describe("SessionRepository", () => {
  it("defaults to the pilot study stage unless STUDY_STAGE=main", async () => {
    const original = process.env.STUDY_STAGE;
    try {
      delete process.env.STUDY_STAGE;
      const { participants, sessions } = makeRepositories();
      const participant = await participants.create({
        role: "PM",
        industry: "Retail",
        experience: "3 years",
        closenessToDiscovery: "5",
      });
      const created = await sessions.create({
        participantId: participant.participantId,
        questionnaireVersion: "1.0.0",
        responseMode: "asynchronous_form",
        firstQuestionId: "q5",
      });
      expect(created.session.record.studyStage).toBe("pilot");

      process.env.STUDY_STAGE = "main";
      const mainSession = await sessions.create({
        participantId: participant.participantId,
        questionnaireVersion: "1.0.0",
        responseMode: "asynchronous_form",
        firstQuestionId: "q5",
      });
      expect(mainSession.session.record.studyStage).toBe("main");
    } finally {
      if (original === undefined) delete process.env.STUDY_STAGE;
      else process.env.STUDY_STAGE = original;
    }
  });

  it("creates a session and resolves it by resume token, not by id guessing", async () => {
    const { participants, sessions } = makeRepositories();
    const participant = await participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const { session, resumeToken } = await sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });

    const found = await sessions.findByResumeToken(resumeToken);
    expect(found?.record.sessionId).toBe(session.record.sessionId);

    const notFound = await sessions.findByResumeToken(generateResumeToken());
    expect(notFound).toBeNull();
  });

  it("looks up an idempotency key on a brand-new spreadsheet without crashing", async () => {
    // Regression test: on a fresh spreadsheet, the Sessions tab does not
    // exist yet. The idempotency check used to read it directly, before
    // anything had ever called ensureSheet — which is exactly what
    // production hit (a 503 on every session-creation request).
    const { sessions } = makeRepositories();
    const result = await sessions.findByClientRequestId("some-request-id");
    expect(result).toBeNull();
  });

  it("marks completion idempotently, so a retried submit is a no-op", async () => {
    const { participants, sessions } = makeRepositories();
    const participant = await participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const { session } = await sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });

    const first = await sessions.markCompleted(session.rowRef);
    expect(first.alreadyCompleted).toBe(false);
    const second = await sessions.markCompleted(session.rowRef);
    expect(second.alreadyCompleted).toBe(true);

    const all = await sessions.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].record.status).toBe("completed");
  });

  it("finds a session by its creation idempotency key and rotates its token, without creating a duplicate", async () => {
    const { participants, sessions } = makeRepositories();
    const participant = await participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const clientRequestId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const created = await sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
      clientRequestId,
    });

    const found = await sessions.findByClientRequestId(clientRequestId);
    expect(found?.record.sessionId).toBe(created.session.record.sessionId);

    const rotated = await sessions.rotateResumeToken(found!.rowRef);
    expect(rotated).not.toBe(created.resumeToken);
    expect(await sessions.findByResumeToken(created.resumeToken)).toBeNull();
    expect((await sessions.findByResumeToken(rotated))?.record.sessionId).toBe(
      created.session.record.sessionId
    );

    expect(await sessions.listAll()).toHaveLength(1);
  });

  it("rejects an unknown response mode / status combination via schema", async () => {
    const { participants, sessions } = makeRepositories();
    const participant = await participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    await expect(
      sessions.create({
        participantId: participant.participantId,
        questionnaireVersion: "1.0.0",
        // @ts-expect-error deliberately invalid for the test
        responseMode: "phone_call",
        firstQuestionId: "q5",
      })
    ).rejects.toBeTruthy();
  });
});

describe("ResponseRepository", () => {
  async function seedSession() {
    const repos = makeRepositories();
    const participant = await repos.participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const { session } = await repos.sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });
    return { ...repos, participant, session };
  }

  it("appends on first save and updates the same row on later edits", async () => {
    const { responses, participant, session, client } = await seedSession();

    const first = await responses.upsert({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "First draft" }),
    });

    const second = await responses.upsert(
      {
        participantId: participant.participantId,
        sessionId: session.record.sessionId,
        questionId: "q5",
        questionVersion: "1",
        construct: "discovery-behaviour",
        responseType: "voice_or_text",
        responseValue: JSON.stringify({ kind: "text", text: "Edited answer" }),
      },
      first.rowRef
    );

    expect(second.rowRef).toBe(first.rowRef);
    const rows = await client.readRange("Responses", "A2:ZZ");
    const nonEmpty = rows.filter((row) => row.some((cell) => cell !== ""));
    expect(nonEmpty).toHaveLength(1);
    expect(second.record.responseValue).toContain("Edited answer");
  });

  it("does not trust a rowRef that belongs to a different session", async () => {
    // Both sessions must share one Responses sheet for this to test
    // anything — otherwise "row 2" in two separate sheets is a coincidence,
    // not a hijack.
    const repos = makeRepositories();
    const owner = await repos.participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const ownerSession = await repos.sessions.create({
      participantId: owner.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });
    const attackerParticipant = await repos.participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const attackerSession = await repos.sessions.create({
      participantId: attackerParticipant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });

    const first = await repos.responses.upsert({
      participantId: owner.participantId,
      sessionId: ownerSession.session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "Owner's answer" }),
    });

    // The attacker's session tries to "update" the owner's row by
    // supplying the owner's rowRef alongside its own sessionId.
    const result = await repos.responses.upsert(
      {
        participantId: attackerParticipant.participantId,
        sessionId: attackerSession.session.record.sessionId,
        questionId: "q5",
        questionVersion: "1",
        construct: "discovery-behaviour",
        responseType: "voice_or_text",
        responseValue: JSON.stringify({ kind: "text", text: "Hijack attempt" }),
      },
      first.rowRef
    );

    // It must have appended its own row rather than overwriting the owner's.
    expect(result.rowRef).not.toBe(first.rowRef);
    const ownerRows = await repos.responses.listBySession(
      ownerSession.session.record.sessionId
    );
    expect(ownerRows[0].responseValue).toContain("Owner's answer");
  });

  it("rejects a response referencing an unknown question id", () => {
    expect(() =>
      responseRecordSchema.parse({
        responseId: "11111111-1111-1111-1111-111111111111",
        participantId: "22222222-2222-2222-2222-222222222222",
        sessionId: "33333333-3333-3333-3333-333333333333",
        questionId: "not-a-real-question",
        questionVersion: "1",
        construct: "discovery-behaviour",
        responseType: "short_text",
        responseValue: '{"kind":"text","text":"x"}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrow(/Unknown question id/);
  });

  it("batches mixed appends and updates via upsertMany", async () => {
    const { responses, participant, session } = await seedSession();
    const firstBatch = await responses.upsertMany([
      {
        input: {
          participantId: participant.participantId,
          sessionId: session.record.sessionId,
          questionId: "q5",
          questionVersion: "1",
          construct: "discovery-behaviour",
          responseType: "voice_or_text",
          responseValue: JSON.stringify({ kind: "text", text: "A" }),
        },
      },
      {
        input: {
          participantId: participant.participantId,
          sessionId: session.record.sessionId,
          questionId: "q6",
          questionVersion: "1",
          construct: "journey-evidence",
          responseType: "voice_or_text",
          responseValue: JSON.stringify({ kind: "text", text: "B" }),
        },
      },
    ]);
    expect(firstBatch).toHaveLength(2);

    const secondBatch = await responses.upsertMany([
      {
        input: {
          participantId: participant.participantId,
          sessionId: session.record.sessionId,
          questionId: "q5",
          questionVersion: "1",
          construct: "discovery-behaviour",
          responseType: "voice_or_text",
          responseValue: JSON.stringify({ kind: "text", text: "A edited" }),
        },
        existingRowRef: firstBatch[0].rowRef,
      },
    ]);
    expect(secondBatch[0].rowRef).toBe(firstBatch[0].rowRef);

    const all = await responses.listBySession(session.record.sessionId);
    expect(all).toHaveLength(2);
  });

  it("does not duplicate a row when a retry arrives with no rowRef at all", async () => {
    // Simulates the first save's response never reaching the browser: the
    // client retries the same answer with no cached rowRef.
    const { responses, participant, session } = await seedSession();
    const first = await responses.upsert({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "Original answer" }),
    });

    const retried = await responses.upsert({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "Original answer" }),
    });

    expect(retried.rowRef).toBe(first.rowRef);
    const all = await responses.listBySession(session.record.sessionId);
    expect(all).toHaveLength(1);
  });

  it("does not duplicate rows in a batch when items arrive with no rowRef", async () => {
    const { responses, participant, session } = await seedSession();
    await responses.upsert({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "First" }),
    });

    // A batched retry for the same question, again with no rowRef.
    await responses.upsertMany([
      {
        input: {
          participantId: participant.participantId,
          sessionId: session.record.sessionId,
          questionId: "q5",
          questionVersion: "1",
          construct: "discovery-behaviour",
          responseType: "voice_or_text",
          responseValue: JSON.stringify({ kind: "text", text: "First" }),
        },
      },
    ]);

    const all = await responses.listBySession(session.record.sessionId);
    expect(all).toHaveLength(1);
  });
});

describe("ConsentRepository", () => {
  it("records voice-input and recording consent as independent flags", async () => {
    const { consent, participants, sessions } = makeRepositories();
    const participant = await participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const { session } = await sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });

    await consent.record({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      consentVersion: "1.0.0",
      participationConsent: true,
      voiceInputConsent: true,
      recordingConsent: false,
    });

    const [record] = await consent.listBySession(session.record.sessionId);
    expect(record.voiceInputConsent).toBe(true);
    expect(record.recordingConsent).toBe(false);
  });
});

describe("ResearchMetadataRepository", () => {
  it("allocates strictly increasing participant numbers", async () => {
    const { researchMetadata } = makeRepositories();
    const first = await researchMetadata.allocateParticipantNumber();
    const second = await researchMetadata.allocateParticipantNumber();
    expect(first).toBe("P001");
    expect(second).toBe("P002");
  });
});

describe("withdrawSession", () => {
  let repos: Awaited<ReturnType<typeof makeRepositories>>;
  beforeEach(() => {
    repos = makeRepositories();
  });

  it("marks the session withdrawn and scrubs only its own responses", async () => {
    const participant = await repos.participants.create({
      role: "PM",
      industry: "Retail",
      experience: "3 years",
      closenessToDiscovery: "5",
    });
    const { session } = await repos.sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });
    const otherParticipant = await repos.participants.create({
      role: "Engineer",
      industry: "Retail",
      experience: "1 year",
      closenessToDiscovery: "1",
    });
    const other = await repos.sessions.create({
      participantId: otherParticipant.participantId,
      questionnaireVersion: "1.0.0",
      responseMode: "asynchronous_form",
      firstQuestionId: "q5",
    });

    await repos.responses.upsert({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "Sensitive answer" }),
    });
    await repos.responses.upsert({
      participantId: otherParticipant.participantId,
      sessionId: other.session.record.sessionId,
      questionId: "q5",
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "voice_or_text",
      responseValue: JSON.stringify({ kind: "text", text: "Untouched answer" }),
    });

    const result = await withdrawSession(repos, session.rowRef);
    expect(result.scrubbedResponseCount).toBe(1);

    const withdrawn = await repos.sessions.getByRowRef(session.rowRef);
    expect(withdrawn?.status).toBe("withdrawn");

    const [scrubbed] = await repos.responses.listBySession(
      session.record.sessionId
    );
    expect(scrubbed.responseValue).toBe("[WITHDRAWN]");

    const [untouched] = await repos.responses.listBySession(
      other.session.record.sessionId
    );
    expect(untouched.responseValue).toContain("Untouched answer");
  });
});
