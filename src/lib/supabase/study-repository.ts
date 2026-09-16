import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { QUESTIONNAIRE_VERSION } from "@/config/interview";
import { CONSENT_VERSION } from "@/config/study";
import { throwIfError } from "@/lib/supabase/db-errors";
import { getInMemoryDb } from "@/lib/supabase/in-memory-db";
import type { QuestionnaireVersionRecord } from "@/lib/supabase/records";
import { rowToQuestionnaireVersion } from "@/lib/supabase/row-mappers";

/**
 * Resolves the questionnaire version every new session/response is tied
 * to. See README "Questionnaire versioning": a session always records the
 * version its participant actually answered, and that row is never
 * mutated once responses exist against it.
 */
export class StudyRepository {
  constructor(private readonly client: SupabaseClient | null) {}

  /**
   * The version new sessions are started under.
   *
   * Self-healing on purpose. Deploying a questionnaire bump without
   * running its migration used to throw here, which surfaced to every new
   * participant as an opaque 500 and stopped recruitment dead until
   * somebody noticed. The row this needs is fully determined by the code
   * (version + consent version + the active study), so rather than fail,
   * provision it and log loudly for the operator. Running the real
   * migration afterwards is idempotent.
   */
  async getActiveQuestionnaireVersion(): Promise<QuestionnaireVersionRecord> {
    const existing = await this.findByVersion(QUESTIONNAIRE_VERSION);
    if (existing?.isActive) return existing;

    console.warn(
      `[study] questionnaire_versions row for "${QUESTIONNAIRE_VERSION}" is ` +
        `${existing ? "inactive" : "missing"}. Provisioning it so sessions can ` +
        "start; run the matching migration in supabase/migrations to make " +
        "this permanent."
    );
    return this.activateConfiguredVersion();
  }

  /**
   * Looks up one version without provisioning anything. Used for sessions
   * a participant already started under an earlier questionnaire: the row
   * must already exist, because they answered it.
   */
  async findByVersion(
    version: string
  ): Promise<QuestionnaireVersionRecord | null> {
    if (!this.client) {
      return (
        getInMemoryDb().questionnaireVersions.find(
          (item) => item.version === version
        ) ?? null
      );
    }

    const { data, error } = await this.client
      .from("questionnaire_versions")
      .select("*")
      .eq("version", version)
      .limit(1)
      .maybeSingle();
    throwIfError(error, "findQuestionnaireVersion");
    return data ? rowToQuestionnaireVersion(data) : null;
  }

  /**
   * Mirrors what the questionnaire migrations do: every other version of
   * this study goes inactive, and the configured one becomes the active
   * row. Idempotent, and safe if two cold starts race — the insert
   * conflicts on the table's own `unique (study_id, version)`.
   */
  private async activateConfiguredVersion(): Promise<QuestionnaireVersionRecord> {
    if (!this.client) {
      const db = getInMemoryDb();
      db.questionnaireVersions = db.questionnaireVersions.map((item) => ({
        ...item,
        isActive: false,
      }));
      const existing = db.questionnaireVersions.find(
        (item) => item.version === QUESTIONNAIRE_VERSION
      );
      if (existing) {
        existing.isActive = true;
        return existing;
      }
      const created: QuestionnaireVersionRecord = {
        id: randomUUID(),
        studyId: db.questionnaireVersions[0]?.studyId ?? randomUUID(),
        version: QUESTIONNAIRE_VERSION,
        consentVersion: CONSENT_VERSION,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      db.questionnaireVersions.push(created);
      return created;
    }

    const studyId = await this.getActiveStudyId();

    const { error: deactivateError } = await this.client
      .from("questionnaire_versions")
      .update({ is_active: false })
      .eq("study_id", studyId)
      .eq("is_active", true)
      .neq("version", QUESTIONNAIRE_VERSION);
    throwIfError(deactivateError, "deactivate questionnaire versions");

    const { data, error } = await this.client
      .from("questionnaire_versions")
      .upsert(
        {
          study_id: studyId,
          version: QUESTIONNAIRE_VERSION,
          consent_version: CONSENT_VERSION,
          is_active: true,
        },
        { onConflict: "study_id,version" }
      )
      .select("*")
      .single();
    throwIfError(error, "activate questionnaire version");
    return rowToQuestionnaireVersion(data);
  }

  private async getActiveStudyId(): Promise<string> {
    const { data, error } = await this.client!.from("studies")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwIfError(error, "getActiveStudy");
    if (!data) {
      throw new Error(
        "No active row in `studies`. Run the seed migration " +
          "(supabase/migrations/20260910100100_seed_study.sql) against this database."
      );
    }
    return data.id as string;
  }
}
