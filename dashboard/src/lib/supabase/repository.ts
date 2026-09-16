import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { getDashboardSupabaseClient } from "./server-client";
import type {
  ConsentRow,
  ParticipantRow,
  QuestionnaireVersionRow,
  ResearchDataSnapshot,
  ResponseRow,
  SessionRow,
  StudyRow,
} from "./rows";

export class DashboardDataError extends Error {
  readonly operation: string;

  constructor(operation: string) {
    super("Research data is temporarily unavailable.");
    this.name = "DashboardDataError";
    this.operation = operation;
  }
}

type QueryResult<T> = PromiseLike<{
  data: T[] | null;
  error: PostgrestError | null;
}>;

async function readRows<T>(
  operation: string,
  query: QueryResult<T>
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    // Do not pass database messages or response values to the browser.
    throw new DashboardDataError(operation);
  }
  return data ?? [];
}

export async function getStudies(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<StudyRow[]> {
  return readRows(
    "read studies",
    db
      .from("studies")
      .select("id,slug,title,is_active,created_at")
      .order("created_at")
  );
}

export async function listQuestionnaireVersions(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<QuestionnaireVersionRow[]> {
  return readRows(
    "read questionnaire versions",
    db
      .from("questionnaire_versions")
      .select("id,study_id,version,consent_version,is_active,created_at")
      .order("created_at")
  );
}

export async function listParticipants(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<ParticipantRow[]> {
  return readRows(
    "read participants",
    db
      .from("participants")
      .select(
        "id,participant_code,role,industry,experience,closeness_to_discovery,created_at"
      )
      .order("participant_code")
  );
}

export async function listSessions(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<SessionRow[]> {
  return readRows(
    "read sessions",
    db
      .from("sessions")
      .select(
        "id,participant_id,questionnaire_version_id,questionnaire_version,response_mode,status,current_question_id,progress_percentage,study_stage,started_at,last_activity_at,completed_at,withdrawn_at"
      )
      .order("started_at")
  );
}

export async function listResponses(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<ResponseRow[]> {
  return readRows(
    "read responses",
    db
      .from("responses")
      .select(
        "id,session_id,participant_id,question_id,question_version,construct,response_type,response_value,created_at,updated_at"
      )
      .order("created_at")
  );
}

export async function listConsents(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<ConsentRow[]> {
  return readRows(
    "read consents",
    db
      .from("consents")
      .select(
        "id,session_id,participant_id,consent_version,participation_consent,voice_input_consent,recording_consent,consented_at"
      )
      .order("consented_at")
  );
}

export async function getResearchDataSnapshot(
  db: SupabaseClient = getDashboardSupabaseClient()
): Promise<ResearchDataSnapshot> {
  const [
    studies,
    questionnaireVersions,
    participants,
    sessions,
    responses,
    consents,
  ] = await Promise.all([
    getStudies(db),
    listQuestionnaireVersions(db),
    listParticipants(db),
    listSessions(db),
    listResponses(db),
    listConsents(db),
  ]);

  return {
    studies,
    questionnaireVersions,
    participants,
    sessions,
    responses,
    consents,
    refreshedAt: new Date().toISOString(),
  };
}
