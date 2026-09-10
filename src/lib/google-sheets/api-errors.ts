import "server-only";

import { SheetsClientError } from "@/lib/google-sheets/sheets-client";

/** A safe, participant-facing message plus an HTTP status. */
export interface SafeApiError {
  status: number;
  message: string;
}

/**
 * Never let a raw Google API error, stack trace, or internal detail reach
 * the response body — log the real cause server-side and return only a
 * generic, participant-safe message.
 */
export function toSafeApiError(
  error: unknown,
  fallbackMessage: string
): SafeApiError {
  if (error instanceof KnownApiError) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof SheetsClientError) {
    // Log the real Google API error server-side (never returned to the
    // client) — the wrapper message alone ("ensureSheet failed") doesn't
    // say whether this is a permission, not-found, quota, or credentials
    // problem, which is exactly what's needed to diagnose it.
    console.error(
      "[google-sheets] request failed:",
      error.message,
      "| cause:",
      describeCause(error.cause)
    );
    return {
      status: 503,
      message:
        "Your response is saved on this device and will retry automatically.",
    };
  }
  console.error("[api] unexpected error:", error);
  return { status: 500, message: fallbackMessage };
}

/**
 * googleapis errors carry the useful detail (HTTP status, Google's own
 * error message — "The caller does not have permission", "Requested
 * entity was not found", "API has not been used...") nested under
 * `.response.data.error` or `.errors`, not in `.message` directly. Pull
 * out whatever is there rather than logging an opaque `[object Object]`.
 */
function describeCause(cause: unknown): unknown {
  if (!cause || typeof cause !== "object") return cause;
  const withResponse = cause as {
    message?: string;
    code?: number | string;
    response?: { data?: { error?: unknown } };
    errors?: unknown;
  };
  return {
    message: withResponse.message,
    code: withResponse.code,
    googleError: withResponse.response?.data?.error ?? withResponse.errors,
  };
}

/** Throw this for expected, participant-safe error conditions. */
export class KnownApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "KnownApiError";
  }
}
