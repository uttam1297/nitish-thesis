import { describe, expect, it } from "vitest";

import { formatPercent, formatTimestamp, humanize } from "./format";

describe("research presentation formatting", () => {
  it("formats metric percentages and technical labels", () => {
    expect(formatPercent(0.75)).toBe("75%");
    expect(humanize("in_progress")).toBe("In Progress");
  });

  it("displays timestamps in Europe/Berlin without changing storage", () => {
    expect(
      formatTimestamp("2026-09-16T08:00:00.000Z", "Europe/Berlin")
    ).toContain("10:00");
  });
});
