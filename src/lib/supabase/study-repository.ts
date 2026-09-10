import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { QUESTIONNAIRE_VERSION } from "@/config/interview";
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

  async getActiveQuestionnaireVersion(): Promise<QuestionnaireVersionRecord> {
    if (!this.client) {
      const found = getInMemoryDb().questionnaireVersions.find(
        (v) => v.version === QUESTIONNAIRE_VERSION && v.isActive
      );
      if (!found) {
        throw new Error(
          `No active questionnaire_versions row for version "${QUESTIONNAIRE_VERSION}".`
        );
      }
      return found;
    }

    const { data, error } = await this.client
      .from("questionnaire_versions")
      .select("*")
      .eq("version", QUESTIONNAIRE_VERSION)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    throwIfError(error, "getActiveQuestionnaireVersion");
    if (!data) {
      throw new Error(
        `No active questionnaire_versions row for version "${QUESTIONNAIRE_VERSION}". ` +
          "Run the seed migration (supabase/migrations) against this database."
      );
    }
    return rowToQuestionnaireVersion(data);
  }
}
