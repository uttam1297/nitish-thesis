import "server-only";

import { unstable_cache } from "next/cache";

import { getDashboardConfig } from "../config/dashboard-config";
import { getResearchDataSnapshot } from "../supabase/repository";
import { calculateDatasetMetrics, runIntegrityChecks } from "./analytics";
import {
  buildParticipantViewModels,
  buildQuestionViewModels,
} from "./view-models";

const { revalidateSeconds } = getDashboardConfig();

const readCachedSnapshot = unstable_cache(
  getResearchDataSnapshot,
  ["thesis-dashboard-research-snapshot-v1"],
  { revalidate: revalidateSeconds, tags: ["thesis-dashboard-research-data"] }
);

export async function getDashboardData() {
  const snapshot = await readCachedSnapshot();
  const participants = buildParticipantViewModels(snapshot);
  const questions = buildQuestionViewModels(participants);
  return {
    snapshot,
    participants,
    questions,
    metrics: calculateDatasetMetrics(participants),
    integrity: runIntegrityChecks(snapshot, participants),
  };
}
