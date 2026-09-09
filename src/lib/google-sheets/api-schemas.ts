import { z } from "zod";

import { RESPONSE_MODES } from "@/lib/google-sheets/records";

/**
 * Request payloads for `/api/interview/*`. Kept separate from the
 * repository-level `records.ts` schemas: these describe what the browser
 * is allowed to send, not the shape of a stored row. Never trust the
 * browser payload directly — always parse it through one of these first.
 */

export const createSessionRequestSchema = z.object({
  questionnaireVersion: z.string().min(1),
  responseMode: z.enum(RESPONSE_MODES).default("asynchronous_form"),
  firstQuestionId: z.string().min(1),
  profile: z.object({
    role: z.string().max(500),
    industry: z.string().max(500),
    experience: z.string().max(500),
    closenessToDiscovery: z.string().max(200),
  }),
  consent: z.object({
    consentVersion: z.string().min(1),
    participationConsent: z.literal(true),
    voiceInputConsent: z.boolean(),
    recordingConsent: z.boolean().default(false),
  }),
});
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

const answerSyncSchema = z.object({
  questionId: z.string().min(1),
  questionVersion: z.string().min(1),
  construct: z.string().min(1),
  responseType: z.enum([
    "single_select",
    "multi_select",
    "likert_scale",
    "ranking",
    "short_text",
    "long_text",
    "voice_or_text",
    "optional_elaboration",
  ]),
  responseValue: z.string(),
  optionalElaboration: z.string().max(5000).optional(),
  /** The rowRef this question was saved to last time, if any. */
  rowRef: z.number().int().positive().optional(),
});

export const syncRequestSchema = z.object({
  sessionId: z.string().uuid(),
  sessionRowRef: z.number().int().positive(),
  resumeToken: z.string().min(1),
  currentQuestionId: z.string(),
  progressPercentage: z.number().int().min(0).max(100),
  answers: z.array(answerSyncSchema).max(50),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;

export const submitRequestSchema = z.object({
  sessionId: z.string().uuid(),
  sessionRowRef: z.number().int().positive(),
  resumeToken: z.string().min(1),
});
export type SubmitRequest = z.infer<typeof submitRequestSchema>;

export const resumeQuerySchema = z.object({
  token: z.string().min(1),
});

export const liveSessionRequestSchema = z.object({
  questionnaireVersion: z.string().min(1),
  firstQuestionId: z.string().min(1),
  profile: z.object({
    role: z.string().max(500),
    industry: z.string().max(500),
    experience: z.string().max(500),
    closenessToDiscovery: z.string().max(200),
  }),
  consent: z.object({
    consentVersion: z.string().min(1),
    participationConsent: z.literal(true),
    voiceInputConsent: z.boolean().default(false),
    recordingConsent: z.boolean().default(false),
  }),
});
export type LiveSessionRequest = z.infer<typeof liveSessionRequestSchema>;
