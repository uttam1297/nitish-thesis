import "server-only";

const DEFAULT_REVALIDATE_SECONDS = 1800;
const MINIMUM_REVALIDATE_SECONDS = 60;
const DEFAULT_TIMEZONE = "Europe/Berlin";

type DashboardEnvironment = Readonly<Record<string, string | undefined>>;

export type DashboardConfig = Readonly<{
  revalidateSeconds: number;
  showNarratives: boolean;
  showRawJson: boolean;
  timezone: string;
}>;

export type DashboardDatabaseConfig = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}>;

function parseBoolean(
  value: string | undefined,
  variableName: string,
  defaultValue: boolean
): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${variableName} must be either "true" or "false".`);
}

function parseRevalidateSeconds(value: string | undefined): number {
  if (value === undefined || value === "") {
    return DEFAULT_REVALIDATE_SECONDS;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `DASHBOARD_REVALIDATE_SECONDS must be an integer greater than or equal to ${MINIMUM_REVALIDATE_SECONDS}.`
    );
  }

  const seconds = Number(value);

  if (!Number.isSafeInteger(seconds) || seconds < MINIMUM_REVALIDATE_SECONDS) {
    throw new Error(
      `DASHBOARD_REVALIDATE_SECONDS must be an integer greater than or equal to ${MINIMUM_REVALIDATE_SECONDS}.`
    );
  }

  return seconds;
}

function parseTimezone(value: string | undefined): string {
  const timezone = value || DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new Error(
      `DASHBOARD_TIMEZONE must be a timezone recognised by the JavaScript runtime. Received "${timezone}".`
    );
  }

  return timezone;
}

function requireSupabaseUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      "DASHBOARD_SUPABASE_URL is required when database configuration is requested."
    );
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new Error(
      "DASHBOARD_SUPABASE_URL must be a valid HTTP or HTTPS URL."
    );
  }

  return value;
}

function requireServiceRoleKey(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      "DASHBOARD_SUPABASE_SERVICE_ROLE_KEY is required when database configuration is requested."
    );
  }

  return value;
}

export function getDashboardConfig(
  environment: DashboardEnvironment = process.env
): DashboardConfig {
  return {
    revalidateSeconds: parseRevalidateSeconds(
      environment.DASHBOARD_REVALIDATE_SECONDS
    ),
    showNarratives: parseBoolean(
      environment.DASHBOARD_SHOW_NARRATIVES,
      "DASHBOARD_SHOW_NARRATIVES",
      false
    ),
    showRawJson: parseBoolean(
      environment.DASHBOARD_SHOW_RAW_JSON,
      "DASHBOARD_SHOW_RAW_JSON",
      false
    ),
    timezone: parseTimezone(environment.DASHBOARD_TIMEZONE),
  };
}

export function getDashboardDatabaseConfig(
  environment: DashboardEnvironment = process.env
): DashboardDatabaseConfig {
  return {
    supabaseUrl: requireSupabaseUrl(environment.DASHBOARD_SUPABASE_URL),
    supabaseServiceRoleKey: requireServiceRoleKey(
      environment.DASHBOARD_SUPABASE_SERVICE_ROLE_KEY
    ),
  };
}
