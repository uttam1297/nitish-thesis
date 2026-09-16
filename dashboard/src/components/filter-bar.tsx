import type { DashboardFilters } from "@/lib/research/filters";

export function FilterBar({ filters, showStatus = false, showSearch = false }: { filters: DashboardFilters; showStatus?: boolean; showSearch?: boolean }) {
  return (
    <form className="filter-bar" method="get">
      {showSearch && <label>Participant code<input name="search" defaultValue={filters.search} placeholder="P007" /></label>}
      <label>Study stage<select name="stage" defaultValue={filters.stage}><option value="main">Main</option><option value="pilot">Pilot</option><option value="all">All stages</option></select></label>
      <label>Questionnaire<select name="version" defaultValue={filters.version}><option value="all">All versions</option><option value="1.3.0">1.3.0</option></select></label>
      <label>Collection mode<select name="mode" defaultValue={filters.mode}><option value="all">All modes</option><option value="asynchronous_form">Asynchronous form</option><option value="live_interview">Live interview</option></select></label>
      {showStatus && <label>Status<select name="status" defaultValue={filters.status}><option value="all">All statuses</option><option value="started">Started</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="withdrawn">Withdrawn</option></select></label>}
      <button className="button" type="submit">Apply filters</button>
    </form>
  );
}
