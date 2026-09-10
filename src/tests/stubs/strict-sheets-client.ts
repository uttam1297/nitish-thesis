import { InMemorySheetsClient } from "@/lib/google-sheets/in-memory-sheets-client";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

/**
 * Wraps `InMemorySheetsClient` but throws on any read/write to a sheet
 * `ensureSheet` hasn't been called for yet — the real Google Sheets API
 * errors when a range is read from a tab that doesn't exist, but the
 * plain in-memory fake used to silently return `[]` instead. That gap let
 * a real production bug through: a repository method that read a sheet
 * without calling `ensureSheet` first, and against a brand-new
 * spreadsheet, crashed with a 503. Every repository test should run
 * against this client, not the lenient one, so a missing `ensureSheet`
 * call fails a test instead of only failing in production.
 */
export class StrictSheetsClient implements SheetsClient {
  private readonly inner = new InMemorySheetsClient();
  private readonly ensuredSheets = new Set<string>();

  async ensureSheet(sheetName: string, headers: string[]): Promise<void> {
    await this.inner.ensureSheet(sheetName, headers);
    this.ensuredSheets.add(sheetName);
  }

  private requireEnsured(sheetName: string): void {
    if (!this.ensuredSheets.has(sheetName)) {
      throw new Error(
        `StrictSheetsClient: "${sheetName}" was read/written without calling ` +
          "ensureSheet first — the real Sheets API would fail this exact way " +
          "against a tab that doesn't exist yet."
      );
    }
  }

  async readRange(sheetName: string, a1Range: string): Promise<string[][]> {
    this.requireEnsured(sheetName);
    return this.inner.readRange(sheetName, a1Range);
  }

  async readRow(sheetName: string, rowNumber: number): Promise<string[]> {
    this.requireEnsured(sheetName);
    return this.inner.readRow(sheetName, rowNumber);
  }

  async appendRow(sheetName: string, values: string[]): Promise<number> {
    this.requireEnsured(sheetName);
    return this.inner.appendRow(sheetName, values);
  }

  async appendRows(sheetName: string, rows: string[][]): Promise<number[]> {
    this.requireEnsured(sheetName);
    return this.inner.appendRows(sheetName, rows);
  }

  async updateRow(
    sheetName: string,
    rowNumber: number,
    values: string[]
  ): Promise<void> {
    this.requireEnsured(sheetName);
    return this.inner.updateRow(sheetName, rowNumber, values);
  }

  async updateRows(
    sheetName: string,
    updates: { rowNumber: number; values: string[] }[]
  ): Promise<void> {
    this.requireEnsured(sheetName);
    return this.inner.updateRows(sheetName, updates);
  }
}
