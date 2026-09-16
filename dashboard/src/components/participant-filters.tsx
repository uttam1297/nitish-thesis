import { FilterBar } from "./filter-bar";
import type { DashboardFilters } from "@/lib/research/filters";

export function ParticipantFilters({
  filters,
  roles,
  industries,
  experiences,
}: {
  filters: DashboardFilters;
  roles: readonly string[];
  industries: readonly string[];
  experiences: readonly string[];
}) {
  return (
    <>
      <FilterBar filters={filters} showSearch showStatus />
      <form className="filter-bar" method="get">
        <input type="hidden" name="stage" value={filters.stage} />
        <input type="hidden" name="version" value={filters.version} />
        <input type="hidden" name="mode" value={filters.mode} />
        <input type="hidden" name="status" value={filters.status} />
        <label>
          Role
          <select name="role" defaultValue={filters.role}>
            <option value="">All roles</option>
            {roles.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Industry
          <select name="industry" defaultValue={filters.industry}>
            <option value="">All industries</option>
            {industries.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Experience
          <select name="experience" defaultValue={filters.experience}>
            <option value="">All experience</option>
            {experiences.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Discovery score
          <input
            name="closeness"
            defaultValue={filters.closeness}
            inputMode="numeric"
            placeholder="1–5"
          />
        </label>
        <label>
          Completeness
          <select name="completeness" defaultValue={filters.completeness}>
            <option value="all">All</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <button className="button" type="submit">
          Apply profile filters
        </button>
      </form>
    </>
  );
}
