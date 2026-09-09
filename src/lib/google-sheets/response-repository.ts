import "server-only";

import { randomUUID } from "node:crypto";

import {
  responseRecordSchema,
  type ResponseRecord,
} from "@/lib/google-sheets/records";
import { responseToRow, rowToResponse } from "@/lib/google-sheets/row-mappers";
import {
  RESPONSE_HEADERS,
  SHEET_NAMES,
} from "@/lib/google-sheets/sheet-schema";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

export interface UpsertResponseInput {
  participantId: string;
  sessionId: string;
  questionId: string;
  questionVersion: string;
  construct: string;
  responseType: ResponseRecord["responseType"];
  /** JSON-serialized `AnswerValue`. */
  responseValue: string;
  optionalElaboration?: string;
}

export interface UpsertResponseResult {
  record: ResponseRecord;
  /** Cache this and pass it back as `existingRowRef` on the next save. */
  rowRef: number;
}

/**
 * Long-format Responses sheet: one row per (session, question). The write
 * path never scans the sheet — a first save appends and hands back the row
 * number; every later edit updates that exact row, after re-checking the
 * row still belongs to the claimed session (a cheap single-row read),
 * which stops a tampered `existingRowRef` from overwriting someone else's
 * answer.
 */
export class ResponseRepository {
  constructor(private readonly client: SheetsClient) {}

  async upsert(
    input: UpsertResponseInput,
    existingRowRef?: number
  ): Promise<UpsertResponseResult> {
    await this.client.ensureSheet(SHEET_NAMES.responses, [...RESPONSE_HEADERS]);

    if (existingRowRef !== undefined) {
      const owned = await this.verifyOwnership(existingRowRef, input.sessionId);
      if (owned) {
        const updated = responseRecordSchema.parse({
          ...owned,
          questionVersion: input.questionVersion,
          construct: input.construct,
          responseType: input.responseType,
          responseValue: input.responseValue,
          optionalElaboration: input.optionalElaboration,
          updatedAt: new Date().toISOString(),
        });
        await this.client.updateRow(
          SHEET_NAMES.responses,
          existingRowRef,
          responseToRow(updated)
        );
        return { record: updated, rowRef: existingRowRef };
      }
      // Row ref stale or didn't match this session: fall through to append,
      // rather than trusting an unverified row.
    }

    const now = new Date().toISOString();
    const record = responseRecordSchema.parse({
      responseId: randomUUID(),
      participantId: input.participantId,
      sessionId: input.sessionId,
      questionId: input.questionId,
      questionVersion: input.questionVersion,
      construct: input.construct,
      responseType: input.responseType,
      responseValue: input.responseValue,
      optionalElaboration: input.optionalElaboration,
      createdAt: now,
      updatedAt: now,
    });
    const rowRef = await this.client.appendRow(
      SHEET_NAMES.responses,
      responseToRow(record)
    );
    return { record, rowRef };
  }

  /** Batches several upserts (mixed appends/updates) into as few API calls as possible. */
  async upsertMany(
    inputs: { input: UpsertResponseInput; existingRowRef?: number }[]
  ): Promise<UpsertResponseResult[]> {
    await this.client.ensureSheet(SHEET_NAMES.responses, [...RESPONSE_HEADERS]);

    const results: (UpsertResponseResult | null)[] = new Array(
      inputs.length
    ).fill(null);
    const updates: {
      position: number;
      rowRef: number;
      record: ResponseRecord;
    }[] = [];
    const appends: { position: number; record: ResponseRecord }[] = [];

    for (const [position, { input, existingRowRef }] of inputs.entries()) {
      const owned =
        existingRowRef !== undefined
          ? await this.verifyOwnership(existingRowRef, input.sessionId)
          : null;

      if (owned && existingRowRef !== undefined) {
        const updated = responseRecordSchema.parse({
          ...owned,
          questionVersion: input.questionVersion,
          construct: input.construct,
          responseType: input.responseType,
          responseValue: input.responseValue,
          optionalElaboration: input.optionalElaboration,
          updatedAt: new Date().toISOString(),
        });
        updates.push({ position, rowRef: existingRowRef, record: updated });
      } else {
        const now = new Date().toISOString();
        const record = responseRecordSchema.parse({
          responseId: randomUUID(),
          participantId: input.participantId,
          sessionId: input.sessionId,
          questionId: input.questionId,
          questionVersion: input.questionVersion,
          construct: input.construct,
          responseType: input.responseType,
          responseValue: input.responseValue,
          optionalElaboration: input.optionalElaboration,
          createdAt: now,
          updatedAt: now,
        });
        appends.push({ position, record });
      }
    }

    if (updates.length > 0) {
      await this.client.updateRows(
        SHEET_NAMES.responses,
        updates.map(({ rowRef, record }) => ({
          rowNumber: rowRef,
          values: responseToRow(record),
        }))
      );
      updates.forEach(({ position, rowRef, record }) => {
        results[position] = { record, rowRef };
      });
    }

    if (appends.length > 0) {
      const rowRefs = await this.client.appendRows(
        SHEET_NAMES.responses,
        appends.map(({ record }) => responseToRow(record))
      );
      appends.forEach(({ position, record }, index) => {
        results[position] = { record, rowRef: rowRefs[index] };
      });
    }

    return results as UpsertResponseResult[];
  }

  private async verifyOwnership(
    rowRef: number,
    sessionId: string
  ): Promise<ResponseRecord | null> {
    const row = await this.client.readRow(SHEET_NAMES.responses, rowRef);
    if (row.length === 0 || !row[0]) return null;
    const record = rowToResponse(row);
    return record.sessionId === sessionId ? record : null;
  }

  /** Full-sheet read: used for admin session detail and export views only. */
  async listBySession(sessionId: string): Promise<ResponseRecord[]> {
    const rows = await this.client.readRange(SHEET_NAMES.responses, "A2:ZZ");
    return rows
      .filter((row) => row.some((cell) => cell !== ""))
      .map(rowToResponse)
      .filter((record) => record.sessionId === sessionId);
  }

  /** For the researcher's question/construct view. Also a full-sheet read. */
  async listByQuestion(questionId: string): Promise<ResponseRecord[]> {
    const rows = await this.client.readRange(SHEET_NAMES.responses, "A2:ZZ");
    return rows
      .filter((row) => row.some((cell) => cell !== ""))
      .map(rowToResponse)
      .filter((record) => record.questionId === questionId);
  }

  /**
   * Part of the withdrawal workflow: overwrites response content for every
   * row belonging to `sessionId` rather than deleting rows, so row numbers
   * already cached elsewhere never go stale mid-request.
   */
  async withdrawSession(sessionId: string): Promise<number> {
    const rows = await this.client.readRange(SHEET_NAMES.responses, "A2:ZZ");
    const now = new Date().toISOString();
    const updates: { rowNumber: number; values: string[] }[] = [];

    rows.forEach((row, index) => {
      if (row.every((cell) => cell === "")) return;
      const record = rowToResponse(row);
      if (record.sessionId !== sessionId) return;
      updates.push({
        rowNumber: index + 2,
        values: responseToRow(
          responseRecordSchema.parse({
            ...record,
            responseValue: "[WITHDRAWN]",
            optionalElaboration: undefined,
            updatedAt: now,
          })
        ),
      });
    });

    if (updates.length > 0) {
      await this.client.updateRows(SHEET_NAMES.responses, updates);
    }
    return updates.length;
  }
}
