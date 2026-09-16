import type { ParticipantViewModel } from "./view-models";

export type DashboardFilters = Readonly<{
  stage: "main" | "pilot" | "all";
  version: string;
  mode: "all" | "asynchronous_form" | "live_interview";
  status: "all" | ParticipantViewModel["status"];
  search: string;
}>;

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function parseDashboardFilters(params: SearchParams): DashboardFilters {
  const stage = single(params.stage);
  const mode = single(params.mode);
  const status = single(params.status);
  return {
    stage: stage === "pilot" || stage === "all" ? stage : "main",
    version: /^\d+\.\d+\.\d+$/.test(single(params.version)) ? single(params.version) : "all",
    mode: mode === "asynchronous_form" || mode === "live_interview" ? mode : "all",
    status: status === "started" || status === "in_progress" || status === "completed" || status === "withdrawn" ? status : "all",
    search: single(params.search).trim().slice(0, 40),
  };
}

export function applyParticipantFilters(participants: readonly ParticipantViewModel[], filters: DashboardFilters): ParticipantViewModel[] {
  const search = filters.search.toLocaleLowerCase();
  return participants.filter((participant) =>
    (filters.stage === "all" || participant.studyStage === filters.stage) &&
    (filters.version === "all" || participant.questionnaireVersion === filters.version) &&
    (filters.mode === "all" || participant.responseMode === filters.mode) &&
    (filters.status === "all" || participant.status === filters.status) &&
    (!search || participant.participantCode.toLocaleLowerCase().includes(search)),
  );
}
