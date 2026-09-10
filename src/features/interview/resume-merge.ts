import type { ResponseMap } from "@/domain/interview/types";

/**
 * Resume conflict rule: for each question, keep whichever copy of the
 * answer has the newer `updatedAt` — local or server. This is what stops
 * a stale resume link (opened again after local edits that never made it
 * to the server) from silently discarding newer, unsynced text. See
 * README "Resume conflict strategy".
 */
export function mergeResponsesByRecency(
  serverResponses: ResponseMap,
  localResponses: ResponseMap
): ResponseMap {
  const merged: ResponseMap = { ...serverResponses };
  for (const [questionId, localResponse] of Object.entries(localResponses)) {
    const serverResponse = merged[questionId];
    const localIsNewer =
      !serverResponse ||
      new Date(localResponse.updatedAt) > new Date(serverResponse.updatedAt);
    if (localIsNewer) merged[questionId] = localResponse;
  }
  return merged;
}
