export type StudyRow = Readonly<{
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  created_at: string;
}>;

export type QuestionnaireVersionRow = Readonly<{
  id: string;
  study_id: string;
  version: string;
  consent_version: string;
  is_active: boolean;
  created_at: string;
}>;

export type ParticipantRow = Readonly<{
  id: string;
  participant_code: string;
  role: string;
  industry: string;
  experience: string;
  closeness_to_discovery: string;
  created_at: string;
}>;

export type SessionRow = Readonly<{
  id: string;
  participant_id: string;
  questionnaire_version_id: string;
  questionnaire_version: string;
  response_mode: "asynchronous_form" | "live_interview";
  status: "started" | "in_progress" | "completed" | "withdrawn";
  current_question_id: string;
  progress_percentage: number;
  study_stage: "pilot" | "main";
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  withdrawn_at: string | null;
}>;

export type ResponseRow = Readonly<{
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
}>;

export type ConsentRow = Readonly<{
  id: string;
  session_id: string;
  participant_id: string;
  consent_version: string;
  participation_consent: boolean;
  voice_input_consent: boolean;
  recording_consent: boolean;
  consented_at: string;
}>;

export type ResearchDataSnapshot = Readonly<{
  studies: readonly StudyRow[];
  questionnaireVersions: readonly QuestionnaireVersionRow[];
  participants: readonly ParticipantRow[];
  sessions: readonly SessionRow[];
  responses: readonly ResponseRow[];
  consents: readonly ConsentRow[];
  refreshedAt: string;
}>;
