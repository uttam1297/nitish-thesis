import type { ParticipantViewModel } from "./view-models";

/**
 * Filters the dashboard exposes to visitors. Study stage, questionnaire
 * version and collection mode are deliberately absent: they are internal
 * research-system metadata, and every record is shown as one dataset. Both
 * fields are still read from Supabase and still drive per-session question
 * mapping — they are simply not visitor-facing controls.
 */
export type DashboardFilters = Readonly<{
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
  const status = single(params.status);
  const completeness = single(params.completeness);
  return {
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
