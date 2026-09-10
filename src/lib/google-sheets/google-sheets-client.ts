import "server-only";

import { google, type sheets_v4 } from "googleapis";

import type { GoogleSheetsCredentials } from "@/lib/google-sheets/env";
import {
  SheetsClientError,
  type SheetsClient,
} from "@/lib/google-sheets/sheets-client";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** Real Sheets API implementation. Only ever constructed on the server. */
export class GoogleSheetsClient implements SheetsClient {
  private readonly sheets: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  /**
   * Every repository call runs `ensureSheet` defensively, but the tab and
   * its header row don't change within a process's lifetime — without
   * this cache, that would mean a `spreadsheets.get` (and often a header
   * write) on *every* read and write, doubling or tripling Sheets API
   * traffic for no reason. See `README.md` "Reduce Google Sheets API
   * traffic".
   */
  private readonly ensuredSheets = new Set<string>();

  constructor(credentials: GoogleSheetsCredentials) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.clientEmail,
        private_key: credentials.privateKey,
      },
      projectId: credentials.projectId,
      scopes: [SHEETS_SCOPE],
    });
    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = credentials.spreadsheetId;
  }

  private async run<T>(
    operation: () => Promise<T>,
    action: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw new SheetsClientError(`Google Sheets ${action} failed.`, error);
    }
  }

  /**
   * Verified once per tab per process, then cached. A tab that exists with
   * a header row that doesn't match `headers` is a real data-integrity
   * problem (someone edited the sheet by hand, or an old deploy used a
   * different schema) — this fails loudly in server logs rather than
   * guessing which column is which and writing into the wrong one.
   */
  async ensureSheet(sheetName: string, headers: string[]): Promise<void> {
    if (this.ensuredSheets.has(sheetName)) return;

    await this.run(async () => {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const exists = spreadsheet.data.sheets?.some(
        (sheet) => sheet.properties?.title === sheetName
      );

      if (!exists) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: sheetName } } }],
          },
        });
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headers] },
        });
        return;
      }

      const existingHeaderRow = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:${columnLetterFor(headers.length)}1`,
      });
      const existingHeaders = existingHeaderRow.data.values?.[0] ?? [];

      if (existingHeaders.length === 0) {
        // Sheet exists but was never given headers (e.g. created manually).
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headers] },
        });
        return;
      }

      const matches =
        existingHeaders.length === headers.length &&
        existingHeaders.every((cell, index) => cell === headers[index]);
      if (!matches) {
        throw new Error(
          `Sheet "${sheetName}" has an unexpected header row (expected ` +
            `${JSON.stringify(headers)}, found ${JSON.stringify(existingHeaders)}). ` +
            "Refusing to write until this is corrected, to avoid landing data in the wrong columns."
        );
      }
    }, "ensureSheet");

    this.ensuredSheets.add(sheetName);
  }

  async readRange(sheetName: string, a1Range: string): Promise<string[][]> {
    return this.run(async () => {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${a1Range}`,
      });
      return (response.data.values ?? []) as string[][];
    }, "readRange");
  }

  async readRow(sheetName: string, rowNumber: number): Promise<string[]> {
    const rows = await this.readRange(
      sheetName,
      `A${rowNumber}:ZZ${rowNumber}`
    );
    return rows[0] ?? [];
  }

  async appendRow(sheetName: string, values: string[]): Promise<number> {
    const [rowNumber] = await this.appendRows(sheetName, [values]);
    return rowNumber;
  }

  async appendRows(sheetName: string, rows: string[][]): Promise<number[]> {
    return this.run(async () => {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: rows },
      });

      const updatedRange = response.data.updates?.updatedRange;
      const firstRow = parseFirstRowFromRange(updatedRange);
      if (firstRow === null) {
        throw new Error("Could not determine appended row number.");
      }
      return rows.map((_, index) => firstRow + index);
    }, "appendRows");
  }

  async updateRow(
    sheetName: string,
    rowNumber: number,
    values: string[]
  ): Promise<void> {
    await this.updateRows(sheetName, [{ rowNumber, values }]);
  }

  async updateRows(
    sheetName: string,
    updates: { rowNumber: number; values: string[] }[]
  ): Promise<void> {
    await this.run(async () => {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: updates.map(({ rowNumber, values }) => ({
            range: `${sheetName}!A${rowNumber}`,
            values: [values],
          })),
        },
      });
    }, "updateRows");
  }
}

/** 1 -> "A", 26 -> "Z", 27 -> "AA". Used to size a header-row read exactly. */
function columnLetterFor(count: number): string {
  let n = count;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters || "A";
}

/** `"Sheet1!A5:Z5"` -> `5`. Returns null if the range can't be parsed. */
function parseFirstRowFromRange(
  range: string | null | undefined
): number | null {
  if (!range) return null;
  const match = range.match(/![A-Z]+(\d+):/);
  return match ? Number(match[1]) : null;
}
