import type {
  ConsentRecord,
  ParticipantRecord,
  QuestionnaireVersionRecord,
  ResponseMode,
  ResponseRecord,
  SessionRecord,
  SessionStatus,
  StudyStage,
} from "@/lib/supabase/records";

/** Supabase returns snake_case columns; the app's domain types are camelCase. */

export function rowToQuestionnaireVersion(row: {
  id: string;
  study_id: string;
  version: string;
  consent_version: string;
  is_active: boolean;
  created_at: string;
}): QuestionnaireVersionRecord {
  return {
    id: row.id,
    studyId: row.study_id,
    version: row.version,
    consentVersion: row.consent_version,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function rowToParticipant(row: {
  id: string;
  participant_code: string;
  role: string;
  industry: string;
  experience: string;
  closeness_to_discovery: string;
  created_at: string;
}): ParticipantRecord {
  return {
    id: row.id,
    participantCode: row.participant_code,
    role: row.role,
    industry: row.industry,
    experience: row.experience,
    closenessToDiscovery: row.closeness_to_discovery,
    createdAt: row.created_at,
  };
}

export function rowToSession(row: {
  id: string;
  participant_id: string;
  questionnaire_version_id: string;
  questionnaire_version: string;
  resume_token_hash: string;
  response_mode: string;
  status: string;
  current_question_id: string;
  progress_percentage: number;
  study_stage: string;
  client_request_id: string | null;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  withdrawn_at: string | null;
}): SessionRecord {
  return {
    id: row.id,
    participantId: row.participant_id,
    questionnaireVersionId: row.questionnaire_version_id,
    questionnaireVersion: row.questionnaire_version,
    resumeTokenHash: row.resume_token_hash,
    responseMode: row.response_mode as ResponseMode,
    status: row.status as SessionStatus,
    currentQuestionId: row.current_question_id,
    progressPercentage: row.progress_percentage,
    studyStage: row.study_stage as StudyStage,
    clientRequestId: row.client_request_id,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    completedAt: row.completed_at,
    withdrawnAt: row.withdrawn_at,
  };
}

export function rowToResponse(row: {
  id: string;
  session_id: string;
  participant_id: string;
  question_id: string;
  question_version: string;
  construct: string;
  response_type: string;
  response_value: unknown;
  optional_elaboration: string | null;
  created_at: string;
  updated_at: string;
}): ResponseRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    questionId: row.question_id,
    questionVersion: row.question_version,
    construct: row.construct,
    responseType: row.response_type as ResponseRecord["responseType"],
    responseValue: row.response_value,
    optionalElaboration: row.optional_elaboration,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToConsent(row: {
  id: string;
  session_id: string;
  participant_id: string;
  consent_version: string;
  participation_consent: boolean;
  voice_input_consent: boolean;
  recording_consent: boolean;
  consented_at: string;
}): ConsentRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    consentVersion: row.consent_version,
    participationConsent: row.participation_consent,
    voiceInputConsent: row.voice_input_consent,
    recordingConsent: row.recording_consent,
    consentedAt: row.consented_at,
  };
}
