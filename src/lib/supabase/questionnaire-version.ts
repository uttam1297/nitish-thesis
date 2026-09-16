import "server-only";

import { getQuestionnaire } from "@/config/interview";
import { KnownApiError } from "@/lib/supabase/api-errors";
import type { QuestionnaireVersionRecord } from "@/lib/supabase/records";
import type { ResearchRepositories } from "@/lib/supabase/repositories";

/**
 * Decides which questionnaire version a new session is pinned to.
 *
 * Normally that is the active one. A browser can legitimately ask for an
 * older version though: drafts are pinned to the questionnaire the
 * participant started answering, so someone who opened the form before a
 * version bump and returns afterwards is still being shown — and still
 * answering — the older wording. Rejecting them stranded that participant
 * for good, because reloading re-reads the same pinned draft and asks for
 * the same version again. Any version this build still serves is therefore
 * accepted, and the session records the version actually answered.
 *
 * A version this build no longer knows about is still refused: there is no
 * question set to attribute those answers to.
 */
export async function resolveQuestionnaireVersion(
  repositories: ResearchRepositories,
  requestedVersion: string
): Promise<QuestionnaireVersionRecord> {
  const active = await repositories.study.getActiveQuestionnaireVersion();
  if (requestedVersion === active.version) return active;

  const servedByThisBuild = Boolean(getQuestionnaire(requestedVersion));
  const stored = servedByThisBuild
    ? await repositories.study.findByVersion(requestedVersion)
    : null;
  if (!stored) {
    throw new KnownApiError(
      409,
      "Your session was started under an outdated version of this study. Please reload the page."
    );
  }

  console.info("[interview] session pinned to a superseded questionnaire", {
    requestedVersion,
    activeVersion: active.version,
  });
  return stored;
}
