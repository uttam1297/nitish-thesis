import "server-only";

import { DatabaseError } from "@/lib/supabase/db-errors";

/** A safe, participant-facing message plus an HTTP status. */
export interface SafeApiError {
  status: number;
  message: string;
}

/**
 * Never let a raw database error, stack trace, or internal detail reach
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
  if (error instanceof DatabaseError) {
    console.error(
      "[supabase] request failed:",
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
 * Postgres/PostgREST errors carry the useful detail (`message`, `code`,
 * `details`, `hint`) directly on the error object — surface all of it in
 * server logs rather than an opaque `[object Object]`.
 */
function describeCause(cause: unknown): unknown {
  if (!cause || typeof cause !== "object") return cause;
  const withDetail = cause as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  return {
    message: withDetail.message,
    code: withDetail.code,
    details: withDetail.details,
    hint: withDetail.hint,
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
