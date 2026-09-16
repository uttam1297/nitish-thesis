import type { ParticipantViewModel } from "./view-models";

export type DashboardFilters = Readonly<{
  stage: "main" | "pilot" | "all";
  version: string;
  mode: "all" | "asynchronous_form" | "live_interview";
  status: "all" | ParticipantViewModel["status"];
  search: string;
  role: string;
  industry: string;
  experience: string;
  closeness: string;
  completeness: "all" | "complete" | "incomplete";
}>;

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function parseDashboardFilters(params: SearchParams): DashboardFilters {
  const stage = single(params.stage);
  const mode = single(params.mode);
  const status = single(params.status);
  const completeness = single(params.completeness);
  return {
    stage: stage === "pilot" || stage === "all" ? stage : "main",
    version: /^\d+\.\d+\.\d+$/.test(single(params.version))
      ? single(params.version)
      : "all",
    mode:
      mode === "asynchronous_form" || mode === "live_interview" ? mode : "all",
    status:
      status === "started" ||
      status === "in_progress" ||
      status === "completed" ||
      status === "withdrawn"
        ? status
        : "all",
    search: single(params.search).trim().slice(0, 40),
    role: single(params.role).trim().slice(0, 60),
    industry: single(params.industry).trim().slice(0, 80),
    experience: single(params.experience).trim().slice(0, 40),
    closeness: single(params.closeness).trim().slice(0, 20),
    completeness:
      completeness === "complete" || completeness === "incomplete"
        ? completeness
        : "all",
  };
}

export function applyParticipantFilters(
  participants: readonly ParticipantViewModel[],
  filters: DashboardFilters
): ParticipantViewModel[] {
  const search = filters.search.toLocaleLowerCase();
  return participants.filter(
    (participant) =>
      (filters.stage === "all" || participant.studyStage === filters.stage) &&
      (filters.version === "all" ||
        participant.questionnaireVersion === filters.version) &&
      (filters.mode === "all" || participant.responseMode === filters.mode) &&
      (filters.status === "all" || participant.status === filters.status) &&
      (!search ||
        participant.participantCode.toLocaleLowerCase().includes(search)) &&
      (!filters.role || participant.roles.includes(filters.role)) &&
      (!filters.industry || participant.industry === filters.industry) &&
      (!filters.experience || participant.experience === filters.experience) &&
      (!filters.closeness ||
        participant.discoveryCloseness.startsWith(filters.closeness)) &&
      (filters.completeness === "all" ||
        (filters.completeness === "complete"
          ? participant.coverage === 1
          : participant.coverage < 1))
  );
}
