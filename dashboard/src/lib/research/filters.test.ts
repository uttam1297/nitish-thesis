import { describe, expect, it } from "vitest";

import { parseDashboardFilters } from "./filters";

describe("dashboard URL filters", () => {
  it("rejects arbitrary query syntax", () => {
    expect(parseDashboardFilters({})).toMatchObject({
      status: "all",
      completeness: "all",
      search: "",
    });
    expect(
      parseDashboardFilters({ status: "drop table", completeness: "' or 1=1" })
    ).toMatchObject({ status: "all", completeness: "all" });
  });

  it("accepts bounded public values", () => {
    expect(
      parseDashboardFilters({
        status: "completed",
        completeness: "incomplete",
        search: "P007",
      })
    ).toMatchObject({
      status: "completed",
      completeness: "incomplete",
      search: "P007",
    });
  });

  it("ignores study stage, questionnaire version and collection mode", () => {
    // These are internal research metadata: a crafted URL must not
    // reintroduce a hidden scope the page does not show.
    const filters = parseDashboardFilters({
      stage: "pilot",
      version: "1.3.0",
      mode: "live_interview",
    });
    expect(filters).not.toHaveProperty("stage");
    expect(filters).not.toHaveProperty("version");
    expect(filters).not.toHaveProperty("mode");
  });
});
