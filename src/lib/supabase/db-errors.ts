import "server-only";

/** Wraps a Supabase/Postgres error so callers never see raw driver details. */
export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/** Throws a DatabaseError if `error` is set (the supabase-js `{data,error}` shape). */
export function throwIfError(error: unknown, action: string): void {
  if (error) {
    throw new DatabaseError(`Supabase ${action} failed.`, error);
  }
}
