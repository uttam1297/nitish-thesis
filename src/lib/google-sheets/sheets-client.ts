/**
 * Low-level boundary between the repositories and however rows actually get
 * read/written. `GoogleSheetsClient` (sheets-client.google.ts) implements
 * this against the real Sheets API; `InMemorySheetsClient` implements it
 * for local development (no credentials configured) and for tests, so
 * repository logic never depends on a live spreadsheet.
 *
 * Row numbers are 1-based and include the header row, matching the Sheets
 * API's own convention (row 1 is headers, data starts at row 2).
 */
export interface SheetsClient {
  /** Ensures `sheetName` exists with exactly this header row (idempotent). */
  ensureSheet(sheetName: string, headers: string[]): Promise<void>;

  /** Reads a rectangular range, e.g. all data rows in a small sheet. */
  readRange(sheetName: string, a1Range: string): Promise<string[][]>;

  /** Reads one row by 1-based row number. Empty array if the row is blank. */
  readRow(sheetName: string, rowNumber: number): Promise<string[]>;

  /** Appends one row; returns the 1-based row number it landed on. */
  appendRow(sheetName: string, values: string[]): Promise<number>;

  /** Appends several rows in one request; returns their row numbers in order. */
  appendRows(sheetName: string, rows: string[][]): Promise<number[]>;

  /** Overwrites one existing row in place. */
  updateRow(
    sheetName: string,
    rowNumber: number,
    values: string[]
  ): Promise<void>;

  /** Overwrites several existing rows in one request. */
  updateRows(
    sheetName: string,
    updates: { rowNumber: number; values: string[] }[]
  ): Promise<void>;
}

export class SheetsClientError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "SheetsClientError";
  }
}
