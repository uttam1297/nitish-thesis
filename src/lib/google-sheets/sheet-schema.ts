/**
 * Tab names and header rows for the research spreadsheet. Both the
 * spreadsheet initializer script and every repository import these, so the
 * sheet layout is defined in exactly one place.
 */
export const SHEET_NAMES = {
  participants: "Participants",
  sessions: "Sessions",
  responses: "Responses",
  consent: "Consent",
  researchMetadata: "Research_Metadata",
} as const;

/**
 * Adapted from the generic recommendation to what this study's profile
 * layer (Q1-Q4) actually collects: role, industry, years of experience and
 * closeness to customer discovery/acquisition work.
 */
export const PARTICIPANT_HEADERS = [
  "participant_id",
  "role",
  "industry",
  "experience",
  "closeness_to_discovery",
  "created_at",
] as const;

export const SESSION_HEADERS = [
  "session_id",
  "participant_id",
  "resume_token_hash",
  "questionnaire_version",
  "response_mode",
  "status",
  "current_question_id",
  "progress_percentage",
  "started_at",
  "last_activity_at",
  "completed_at",
  "withdrawn_at",
] as const;

export const RESPONSE_HEADERS = [
  "response_id",
  "participant_id",
  "session_id",
  "question_id",
  "question_version",
  "construct",
  "response_type",
  "response_value",
  "optional_elaboration",
  "created_at",
  "updated_at",
] as const;

export const CONSENT_HEADERS = [
  "consent_id",
  "participant_id",
  "session_id",
  "consent_version",
  "participation_consent",
  "voice_input_consent",
  "recording_consent",
  "consented_at",
] as const;

export const RESEARCH_METADATA_HEADERS = [
  "study_id",
  "study_title",
  "questionnaire_version",
  "consent_version",
  "created_at",
  "is_active",
  "next_participant_number",
] as const;

/** Every tab this application depends on existing, with its header row. */
export const ALL_SHEETS: { name: string; headers: readonly string[] }[] = [
  { name: SHEET_NAMES.participants, headers: PARTICIPANT_HEADERS },
  { name: SHEET_NAMES.sessions, headers: SESSION_HEADERS },
  { name: SHEET_NAMES.responses, headers: RESPONSE_HEADERS },
  { name: SHEET_NAMES.consent, headers: CONSENT_HEADERS },
  { name: SHEET_NAMES.researchMetadata, headers: RESEARCH_METADATA_HEADERS },
];

/** Zips a header row with a data row into a plain object of strings. */
export function rowToRecord(
  headers: readonly string[],
  row: string[]
): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
}

/** Inverse of `rowToRecord`, in header order. */
export function recordToRow(
  headers: readonly string[],
  record: Record<string, string>
): string[] {
  return headers.map((header) => record[header] ?? "");
}
