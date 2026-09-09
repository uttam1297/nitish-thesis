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
    console.error("[google-sheets] request failed:", error.message);
    return {
      status: 503,
      message:
        "Your response is saved on this device and will retry automatically.",
    };
  }
  console.error("[api] unexpected error:", error);
  return { status: 500, message: fallbackMessage };
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
