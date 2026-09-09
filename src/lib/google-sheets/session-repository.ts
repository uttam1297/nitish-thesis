import "server-only";

import { randomUUID } from "node:crypto";

import {
  sessionRecordSchema,
  type ResponseMode,
  type SessionRecord,
} from "@/lib/google-sheets/records";
import {
  generateResumeToken,
  hashResumeToken,
  resumeTokenHashesMatch,
} from "@/lib/google-sheets/resume-token";
import { rowToSession, sessionToRow } from "@/lib/google-sheets/row-mappers";
import { SESSION_HEADERS, SHEET_NAMES } from "@/lib/google-sheets/sheet-schema";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

export interface SessionWithRowRef {
  record: SessionRecord;
  /** 1-based Sheets row. Callers cache this to avoid re-scanning the sheet. */
  rowRef: number;
}

const FIRST_DATA_ROW = 2;

/**
 * One row per interview session. Resume is by hashed token, not by
 * participant id or row number, so a participant can never enumerate or
 * resume someone else's session by guessing.
 */
export class SessionRepository {
  constructor(private readonly client: SheetsClient) {}

  async create(input: {
    participantId: string;
    questionnaireVersion: string;
    responseMode: ResponseMode;
    firstQuestionId: string;
  }): Promise<{ session: SessionWithRowRef; resumeToken: string }> {
    await this.client.ensureSheet(SHEET_NAMES.sessions, [...SESSION_HEADERS]);

    const resumeToken = generateResumeToken();
    const now = new Date().toISOString();
    const record = sessionRecordSchema.parse({
      sessionId: randomUUID(),
      participantId: input.participantId,
      resumeTokenHash: hashResumeToken(resumeToken),
      questionnaireVersion: input.questionnaireVersion,
      responseMode: input.responseMode,
      status: "started",
      currentQuestionId: input.firstQuestionId,
      progressPercentage: 0,
      startedAt: now,
      lastActivityAt: now,
    });

    const rowRef = await this.client.appendRow(
      SHEET_NAMES.sessions,
      sessionToRow(record)
    );
    return { session: { record, rowRef }, resumeToken };
  }

  /**
   * Bounded scan of the Sessions sheet (small at thesis scale) to resolve a
   * resume token into a session. This happens once per resume attempt, not
   * on every save — the save path uses the cached `rowRef` instead.
   */
  async findByResumeToken(token: string): Promise<SessionWithRowRef | null> {
    const targetHash = hashResumeToken(token);
    const rows = await this.client.readRange(SHEET_NAMES.sessions, "A2:ZZ");

    for (const [index, row] of rows.entries()) {
      if (row.every((cell) => cell === "")) continue;
      const record = rowToSession(row);
      if (resumeTokenHashesMatch(record.resumeTokenHash, targetHash)) {
        return { record, rowRef: index + FIRST_DATA_ROW };
      }
    }
    return null;
  }

  async getByRowRef(rowRef: number): Promise<SessionRecord | null> {
    const row = await this.client.readRow(SHEET_NAMES.sessions, rowRef);
    return row.length > 0 && row[0] ? rowToSession(row) : null;
  }

  async updateProgress(
    rowRef: number,
    patch: { currentQuestionId: string; progressPercentage: number }
  ): Promise<void> {
    const current = await this.getByRowRef(rowRef);
    if (!current) return;
    const updated = sessionRecordSchema.parse({
      ...current,
      currentQuestionId: patch.currentQuestionId,
      progressPercentage: patch.progressPercentage,
      status: current.status === "started" ? "in_progress" : current.status,
      lastActivityAt: new Date().toISOString(),
    });
    await this.client.updateRow(
      SHEET_NAMES.sessions,
      rowRef,
      sessionToRow(updated)
    );
  }

  /**
   * Idempotent: completing an already-completed session is a no-op that
   * still reports success, so a retried submit never creates a second
   * "completed" transition or a duplicate row.
   */
  async markCompleted(rowRef: number): Promise<{ alreadyCompleted: boolean }> {
    const current = await this.getByRowRef(rowRef);
    if (!current) throw new Error("Session not found.");
    if (current.status === "completed") return { alreadyCompleted: true };

    const now = new Date().toISOString();
    const updated = sessionRecordSchema.parse({
      ...current,
      status: "completed",
      completedAt: now,
      lastActivityAt: now,
    });
    await this.client.updateRow(
      SHEET_NAMES.sessions,
      rowRef,
      sessionToRow(updated)
    );
    return { alreadyCompleted: false };
  }

  async markWithdrawn(rowRef: number): Promise<void> {
    const current = await this.getByRowRef(rowRef);
    if (!current) throw new Error("Session not found.");
    const now = new Date().toISOString();
    const updated = sessionRecordSchema.parse({
      ...current,
      status: "withdrawn",
      withdrawnAt: now,
      lastActivityAt: now,
    });
    await this.client.updateRow(
      SHEET_NAMES.sessions,
      rowRef,
      sessionToRow(updated)
    );
  }

  /** Admin convenience: resolve a public session id to its row. Full-sheet read. */
  async findBySessionId(sessionId: string): Promise<SessionWithRowRef | null> {
    const all = await this.listAll();
    return all.find((entry) => entry.record.sessionId === sessionId) ?? null;
  }

  /** Full-sheet read: admin overview/list only, not on the participant save path. */
  async listAll(): Promise<SessionWithRowRef[]> {
    const rows = await this.client.readRange(SHEET_NAMES.sessions, "A2:ZZ");
    return rows
      .map((row, index) => ({ row, rowRef: index + FIRST_DATA_ROW }))
      .filter(({ row }) => row.some((cell) => cell !== ""))
      .map(({ row, rowRef }) => ({ record: rowToSession(row), rowRef }));
  }
}
