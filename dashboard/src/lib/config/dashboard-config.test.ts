import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getDashboardConfig,
  getDashboardDatabaseConfig,
} from "./dashboard-config";

describe("getDashboardConfig", () => {
  it("defaults to showing narratives and hiding raw JSON", () => {
    expect(getDashboardConfig({})).toEqual({
      revalidateSeconds: 1800,
      showNarratives: true,
      showRawJson: false,
      timezone: "Europe/Berlin",
    });
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("strictly parses %s as %s", (value, expected) => {
    expect(
      getDashboardConfig({ DASHBOARD_SHOW_NARRATIVES: value }).showNarratives
    ).toBe(expected);
  });

  it("rejects invalid boolean values", () => {
    expect(() =>
      getDashboardConfig({ DASHBOARD_SHOW_RAW_JSON: "yes" })
    ).toThrow('DASHBOARD_SHOW_RAW_JSON must be either "true" or "false".');
  });

  it.each(["1800", "60"])(
    "accepts a revalidation interval of %s seconds",
    (value) => {
      expect(
        getDashboardConfig({ DASHBOARD_REVALIDATE_SECONDS: value })
          .revalidateSeconds
      ).toBe(Number(value));
    }
  );

  it.each(["abc", "3.5", "59"])(
    "rejects an invalid revalidation interval of %s",
    (value) => {
      expect(() =>
        getDashboardConfig({ DASHBOARD_REVALIDATE_SECONDS: value })
      ).toThrow(
        "DASHBOARD_REVALIDATE_SECONDS must be an integer greater than or equal to 60."
      );
    }
  );

  it("accepts a timezone recognised by the runtime", () => {
    expect(
      getDashboardConfig({ DASHBOARD_TIMEZONE: "Europe/Berlin" }).timezone
    ).toBe("Europe/Berlin");
  });

  it("rejects an invalid timezone", () => {
    expect(() =>
      getDashboardConfig({ DASHBOARD_TIMEZONE: "Not/A_Timezone" })
    ).toThrow(
      'DASHBOARD_TIMEZONE must be a timezone recognised by the JavaScript runtime. Received "Not/A_Timezone".'
    );
  });
});

describe("getDashboardDatabaseConfig", () => {
  it("accepts fake database configuration without making a network request", () => {
    expect(
      getDashboardDatabaseConfig({
        DASHBOARD_SUPABASE_URL: "https://example.supabase.co",
        DASHBOARD_SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
      })
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseServiceRoleKey: "fake-service-role-key",
    });
  });

  it("rejects a missing Supabase URL", () => {
    expect(() =>
      getDashboardDatabaseConfig({
        DASHBOARD_SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
      })
    ).toThrow(
      "DASHBOARD_SUPABASE_URL is required when database configuration is requested."
    );
  });

  it("rejects an invalid Supabase URL", () => {
    expect(() =>
      getDashboardDatabaseConfig({
        DASHBOARD_SUPABASE_URL: "not-a-url",
        DASHBOARD_SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
      })
    ).toThrow("DASHBOARD_SUPABASE_URL must be a valid HTTP or HTTPS URL.");
  });

  it("rejects a missing service-role key", () => {
    expect(() =>
      getDashboardDatabaseConfig({
        DASHBOARD_SUPABASE_URL: "https://example.supabase.co",
      })
    ).toThrow(
      "DASHBOARD_SUPABASE_SERVICE_ROLE_KEY is required when database configuration is requested."
    );
  });
});
