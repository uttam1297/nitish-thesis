import { describe, expect, it } from "vitest";

import { parseDashboardFilters } from "./filters";

describe("dashboard URL filters", () => {
  it("defaults to main and rejects arbitrary query syntax", () => {
    expect(parseDashboardFilters({})).toMatchObject({ stage: "main", mode: "all", status: "all" });
    expect(parseDashboardFilters({ stage: "main.eq.pilot", status: "drop table" })).toMatchObject({ stage: "main", status: "all" });
  });

  it("accepts bounded public values", () => {
    expect(parseDashboardFilters({ stage: "pilot", mode: "live_interview", status: "completed", version: "1.3.0" })).toMatchObject({ stage: "pilot", mode: "live_interview", status: "completed", version: "1.3.0" });
  });
});
