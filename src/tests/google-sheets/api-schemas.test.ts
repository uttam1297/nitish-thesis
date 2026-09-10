import { describe, expect, it } from "vitest";

import {
  createSessionRequestSchema,
  submitRequestSchema,
  syncRequestSchema,
} from "@/lib/google-sheets/api-schemas";

describe("createSessionRequestSchema", () => {
  it("accepts a well-formed request", () => {
    expect(() =>
      createSessionRequestSchema.parse({
        questionnaireVersion: "1.0.0",
        responseMode: "asynchronous_form",
        firstQuestionId: "q5",
        clientRequestId: "11111111-1111-4111-8111-111111111111",
        profile: {
          role: "PM",
          industry: "Retail",
          experience: "3 years",
          closenessToDiscovery: "4",
        },
        consent: {
          consentVersion: "1.0.0",
          participationConsent: true,
          voiceInputConsent: false,
          recordingConsent: false,
        },
      })
    ).not.toThrow();
  });

  it("tolerates a missing idempotency key rather than failing the request", () => {
    // A client on an older cached bundle (deploy in progress, stale
    // service worker) may not send this — it must still be able to start
    // a session. See the field comment in api-schemas.ts.
    expect(() =>
      createSessionRequestSchema.parse({
        questionnaireVersion: "1.0.0",
        firstQuestionId: "q5",
        profile: {
          role: "",
          industry: "",
          experience: "",
          closenessToDiscovery: "",
        },
        consent: {
          consentVersion: "1.0.0",
          participationConsent: true,
          voiceInputConsent: false,
        },
      })
    ).not.toThrow();
  });

  it("rejects a malformed idempotency key", () => {
    expect(() =>
      createSessionRequestSchema.parse({
        questionnaireVersion: "1.0.0",
        firstQuestionId: "q5",
        clientRequestId: "not-a-uuid",
        profile: {
          role: "",
          industry: "",
          experience: "",
          closenessToDiscovery: "",
        },
        consent: {
          consentVersion: "1.0.0",
          participationConsent: true,
          voiceInputConsent: false,
        },
      })
    ).toThrow();
  });

  it("never trusts an unconfirmed participation consent", () => {
    expect(() =>
      createSessionRequestSchema.parse({
        questionnaireVersion: "1.0.0",
        firstQuestionId: "q5",
        clientRequestId: "11111111-1111-4111-8111-111111111111",
        profile: {
          role: "",
          industry: "",
          experience: "",
          closenessToDiscovery: "",
        },
        consent: {
          consentVersion: "1.0.0",
          participationConsent: false,
          voiceInputConsent: false,
        },
      })
    ).toThrow();
  });

  it("rejects an unknown response mode", () => {
    expect(() =>
      createSessionRequestSchema.parse({
        questionnaireVersion: "1.0.0",
        responseMode: "phone_call",
        firstQuestionId: "q5",
        clientRequestId: "11111111-1111-4111-8111-111111111111",
        profile: {
          role: "",
          industry: "",
          experience: "",
          closenessToDiscovery: "",
        },
        consent: {
          consentVersion: "1.0.0",
          participationConsent: true,
          voiceInputConsent: false,
        },
      })
    ).toThrow();
  });
});

describe("syncRequestSchema", () => {
  it("caps the number of answers per batch", () => {
    const answers = Array.from({ length: 51 }, (_, index) => ({
      questionId: `q${index}`,
      questionVersion: "1",
      construct: "discovery-behaviour",
      responseType: "short_text" as const,
      responseValue: "{}",
    }));
    expect(() =>
      syncRequestSchema.parse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        sessionRowRef: 2,
        resumeToken: "token",
        currentQuestionId: "q1",
        progressPercentage: 50,
        answers,
      })
    ).toThrow();
  });

  it("rejects a percentage outside 0-100", () => {
    expect(() =>
      syncRequestSchema.parse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        sessionRowRef: 2,
        resumeToken: "token",
        currentQuestionId: "q1",
        progressPercentage: 150,
        answers: [],
      })
    ).toThrow();
  });
});

describe("submitRequestSchema", () => {
  it("requires a well-formed session id", () => {
    expect(() =>
      submitRequestSchema.parse({
        sessionId: "not-a-uuid",
        sessionRowRef: 2,
        resumeToken: "token",
      })
    ).toThrow();
  });
});
