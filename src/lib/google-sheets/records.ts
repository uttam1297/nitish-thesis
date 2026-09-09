import { z } from "zod";

import { questionnaire } from "@/config/interview";
import type { ResponseType } from "@/domain/interview/types";

export const RESPONSE_MODES = ["asynchronous_form", "live_interview"] as const;
export type ResponseMode = (typeof RESPONSE_MODES)[number];

export const SESSION_STATUSES = [
  "started",
  "in_progress",
  "completed",
  "withdrawn",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

const RESPONSE_TYPES = [
  "single_select",
  "multi_select",
  "likert_scale",
  "ranking",
  "short_text",
  "long_text",
  "voice_or_text",
  "optional_elaboration",
] as const satisfies readonly ResponseType[];

const isoTimestamp = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be an ISO timestamp.",
  });

export const participantRecordSchema = z.object({
  participantId: z.string().uuid(),
  role: z.string(),
  industry: z.string(),
  experience: z.string(),
  closenessToDiscovery: z.string(),
  createdAt: isoTimestamp,
});
export type ParticipantRecord = z.infer<typeof participantRecordSchema>;

export const sessionRecordSchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  resumeTokenHash: z.string().min(1),
  questionnaireVersion: z.string().min(1),
  responseMode: z.enum(RESPONSE_MODES),
  status: z.enum(SESSION_STATUSES),
  currentQuestionId: z.string(),
  progressPercentage: z.number().int().min(0).max(100),
  startedAt: isoTimestamp,
  lastActivityAt: isoTimestamp,
  completedAt: isoTimestamp.optional(),
  withdrawnAt: isoTimestamp.optional(),
});
export type SessionRecord = z.infer<typeof sessionRecordSchema>;

const knownQuestionIds = new Set(
  questionnaire.questions.map((question) => question.id)
);
const knownConstructIds = new Set(
  questionnaire.constructs.map((construct) => construct.id)
);

export const responseRecordSchema = z
  .object({
    responseId: z.string().uuid(),
    participantId: z.string().uuid(),
    sessionId: z.string().uuid(),
    questionId: z.string(),
    questionVersion: z.string().min(1),
    construct: z.string(),
    responseType: z.enum(RESPONSE_TYPES),
    /** JSON-serialized `AnswerValue`. */
    responseValue: z.string(),
    optionalElaboration: z.string().optional(),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  })
  .superRefine((record, ctx) => {
    if (!knownQuestionIds.has(record.questionId)) {
      ctx.addIssue({
        code: "custom",
        message: `Unknown question id "${record.questionId}".`,
        path: ["questionId"],
      });
    }
    if (!knownConstructIds.has(record.construct)) {
      ctx.addIssue({
        code: "custom",
        message: `Unknown construct "${record.construct}".`,
        path: ["construct"],
      });
    }
  });
export type ResponseRecord = z.infer<typeof responseRecordSchema>;

export const consentRecordSchema = z.object({
  consentId: z.string().uuid(),
  participantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  consentVersion: z.string().min(1),
  participationConsent: z.boolean(),
  voiceInputConsent: z.boolean(),
  recordingConsent: z.boolean(),
  consentedAt: isoTimestamp,
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;

export const researchMetadataRecordSchema = z.object({
  studyId: z.string().min(1),
  studyTitle: z.string().min(1),
  questionnaireVersion: z.string().min(1),
  consentVersion: z.string().min(1),
  createdAt: isoTimestamp,
  isActive: z.boolean(),
  nextParticipantNumber: z.number().int().positive(),
});
export type ResearchMetadataRecord = z.infer<
  typeof researchMetadataRecordSchema
>;
