import {
  CONSENT_HEADERS,
  PARTICIPANT_HEADERS,
  RESEARCH_METADATA_HEADERS,
  RESPONSE_HEADERS,
  SESSION_HEADERS,
  recordToRow,
  rowToRecord,
} from "@/lib/google-sheets/sheet-schema";
import type {
  ConsentRecord,
  ParticipantRecord,
  ResearchMetadataRecord,
  ResponseMode,
  ResponseRecord,
  SessionRecord,
  SessionStatus,
} from "@/lib/google-sheets/records";

/** Converts one typed record to/from the plain string row Sheets stores. */

export function participantToRow(record: ParticipantRecord): string[] {
  return recordToRow(PARTICIPANT_HEADERS, {
    participant_id: record.participantId,
    role: record.role,
    industry: record.industry,
    experience: record.experience,
    closeness_to_discovery: record.closenessToDiscovery,
    created_at: record.createdAt,
  });
}

export function rowToParticipant(row: string[]): ParticipantRecord {
  const r = rowToRecord(PARTICIPANT_HEADERS, row);
  return {
    participantId: r.participant_id,
    role: r.role,
    industry: r.industry,
    experience: r.experience,
    closenessToDiscovery: r.closeness_to_discovery,
    createdAt: r.created_at,
  };
}

export function sessionToRow(record: SessionRecord): string[] {
  return recordToRow(SESSION_HEADERS, {
    session_id: record.sessionId,
    participant_id: record.participantId,
    resume_token_hash: record.resumeTokenHash,
    questionnaire_version: record.questionnaireVersion,
    response_mode: record.responseMode,
    status: record.status,
    current_question_id: record.currentQuestionId,
    progress_percentage: String(record.progressPercentage),
    started_at: record.startedAt,
    last_activity_at: record.lastActivityAt,
    completed_at: record.completedAt ?? "",
    withdrawn_at: record.withdrawnAt ?? "",
  });
}

export function rowToSession(row: string[]): SessionRecord {
  const r = rowToRecord(SESSION_HEADERS, row);
  return {
    sessionId: r.session_id,
    participantId: r.participant_id,
    resumeTokenHash: r.resume_token_hash,
    questionnaireVersion: r.questionnaire_version,
    responseMode: r.response_mode as ResponseMode,
    status: r.status as SessionStatus,
    currentQuestionId: r.current_question_id,
    progressPercentage: Number(r.progress_percentage) || 0,
    startedAt: r.started_at,
    lastActivityAt: r.last_activity_at,
    completedAt: r.completed_at || undefined,
    withdrawnAt: r.withdrawn_at || undefined,
  };
}

export function responseToRow(record: ResponseRecord): string[] {
  return recordToRow(RESPONSE_HEADERS, {
    response_id: record.responseId,
    participant_id: record.participantId,
    session_id: record.sessionId,
    question_id: record.questionId,
    question_version: record.questionVersion,
    construct: record.construct,
    response_type: record.responseType,
    response_value: record.responseValue,
    optional_elaboration: record.optionalElaboration ?? "",
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });
}

export function rowToResponse(row: string[]): ResponseRecord {
  const r = rowToRecord(RESPONSE_HEADERS, row);
  return {
    responseId: r.response_id,
    participantId: r.participant_id,
    sessionId: r.session_id,
    questionId: r.question_id,
    questionVersion: r.question_version,
    construct: r.construct,
    responseType: r.response_type as ResponseRecord["responseType"],
    responseValue: r.response_value,
    optionalElaboration: r.optional_elaboration || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function consentToRow(record: ConsentRecord): string[] {
  return recordToRow(CONSENT_HEADERS, {
    consent_id: record.consentId,
    participant_id: record.participantId,
    session_id: record.sessionId,
    consent_version: record.consentVersion,
    participation_consent: String(record.participationConsent),
    voice_input_consent: String(record.voiceInputConsent),
    recording_consent: String(record.recordingConsent),
    consented_at: record.consentedAt,
  });
}

export function rowToConsent(row: string[]): ConsentRecord {
  const r = rowToRecord(CONSENT_HEADERS, row);
  return {
    consentId: r.consent_id,
    participantId: r.participant_id,
    sessionId: r.session_id,
    consentVersion: r.consent_version,
    participationConsent: r.participation_consent === "true",
    voiceInputConsent: r.voice_input_consent === "true",
    recordingConsent: r.recording_consent === "true",
    consentedAt: r.consented_at,
  };
}

export function researchMetadataToRow(
  record: ResearchMetadataRecord
): string[] {
  return recordToRow(RESEARCH_METADATA_HEADERS, {
    study_id: record.studyId,
    study_title: record.studyTitle,
    questionnaire_version: record.questionnaireVersion,
    consent_version: record.consentVersion,
    created_at: record.createdAt,
    is_active: String(record.isActive),
    next_participant_number: String(record.nextParticipantNumber),
  });
}

export function rowToResearchMetadata(row: string[]): ResearchMetadataRecord {
  const r = rowToRecord(RESEARCH_METADATA_HEADERS, row);
  return {
    studyId: r.study_id,
    studyTitle: r.study_title,
    questionnaireVersion: r.questionnaire_version,
    consentVersion: r.consent_version,
    createdAt: r.created_at,
    isActive: r.is_active === "true",
    nextParticipantNumber: Number(r.next_participant_number) || 1,
  };
}
