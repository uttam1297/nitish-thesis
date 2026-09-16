import type { DashboardFilters } from "@/lib/research/filters";

export function FilterBar({
  filters,
  showStatus = false,
  showSearch = false,
}: {
  filters: DashboardFilters;
  showStatus?: boolean;
  showSearch?: boolean;
}) {
  if (!showStatus && !showSearch) return null;

  return (
    <form className="filter-bar" method="get">
      {showSearch && (
        <label>
          Participant code
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="P007"
          />
        </label>
      )}
      {showStatus && (
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
      )}
      <button className="button" type="submit">
        Apply filters
      </button>
    </form>
  );
}
