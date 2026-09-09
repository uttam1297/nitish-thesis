import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

/**
 * A `SheetsClient` backed by plain arrays in memory. Used automatically in
 * local development when no `GOOGLE_*` credentials are configured, and in
 * tests so repository logic is exercised without a live spreadsheet.
 *
 * Row 1 is always the header row, matching the real client's convention.
 */
export class InMemorySheetsClient implements SheetsClient {
  private readonly sheets = new Map<string, string[][]>();

  async ensureSheet(sheetName: string, headers: string[]): Promise<void> {
    if (!this.sheets.has(sheetName)) {
      this.sheets.set(sheetName, [headers]);
    }
  }

  async readRange(sheetName: string, _a1Range: string): Promise<string[][]> {
    void _a1Range;
    const rows = this.sheets.get(sheetName) ?? [];
    return rows.slice(1).map((row) => [...row]);
  }

  async readRow(sheetName: string, rowNumber: number): Promise<string[]> {
    const rows = this.sheets.get(sheetName) ?? [];
    return [...(rows[rowNumber - 1] ?? [])];
  }

  async appendRow(sheetName: string, values: string[]): Promise<number> {
    const [rowNumber] = await this.appendRows(sheetName, [values]);
    return rowNumber;
  }

  async appendRows(sheetName: string, rows: string[][]): Promise<number[]> {
    const existing = this.sheets.get(sheetName) ?? [[]];
    const rowNumbers: number[] = [];
    for (const row of rows) {
      existing.push(row);
      rowNumbers.push(existing.length);
    }
    this.sheets.set(sheetName, existing);
    return rowNumbers;
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
    const rows = this.sheets.get(sheetName) ?? [[]];
    for (const { rowNumber, values } of updates) {
      while (rows.length < rowNumber) rows.push([]);
      rows[rowNumber - 1] = values;
    }
    this.sheets.set(sheetName, rows);
  }

  /** Test/debug helper: a snapshot of every sheet's current rows. */
  dump(): Record<string, string[][]> {
    return Object.fromEntries(this.sheets.entries());
  }
}
