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

  async ensureSheet(sheetName: string, headers: string[]): Promise<void> {
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
      }

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }, "ensureSheet");
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

/** `"Sheet1!A5:Z5"` -> `5`. Returns null if the range can't be parsed. */
function parseFirstRowFromRange(
  range: string | null | undefined
): number | null {
  if (!range) return null;
  const match = range.match(/![A-Z]+(\d+):/);
  return match ? Number(match[1]) : null;
}
