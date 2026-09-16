import type { DashboardFilters } from "@/lib/research/filters";

export type RoleOption = Readonly<{ value: string; label: string }>;

/**
 * One form, deliberately. These controls used to be split across two
 * forms with an Apply button each, which silently dropped the other
 * form's values: applying a status lost the chosen role and industry,
 * because those fields were not part of the submitted form.
 */
export function ParticipantFilters({
  filters,
  roles,
  industries,
  experiences,
}: {
  filters: DashboardFilters;
  /** Stored slug plus the label the participant actually saw on the form. */
  roles: readonly RoleOption[];
  industries: readonly string[];
  experiences: readonly string[];
}) {
  return (
    <form className="filter-bar" method="get">
      <label>
        Participant code
        <input name="search" defaultValue={filters.search} placeholder="P007" />
      </label>
      <label>
        Status
        <select name="status" defaultValue={filters.status}>
          <option value="all">All statuses</option>
          <option value="started">Started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </label>
      <label>
        Role
        <select name="role" defaultValue={filters.role}>
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
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
        Apply filters
      </button>
    </form>
  );
}
