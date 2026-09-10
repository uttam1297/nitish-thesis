import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError } from "@/lib/supabase/db-errors";
import { getInMemoryDb } from "@/lib/supabase/in-memory-db";
import type { ResponseRecord } from "@/lib/supabase/records";
import { rowToResponse } from "@/lib/supabase/row-mappers";

export interface UpsertResponseInput {
  sessionId: string;
  participantId: string;
  questionId: string;
  questionVersion: string;
  construct: string;
  responseType: ResponseRecord["responseType"];
  /** Parsed `AnswerValue`, stored as native jsonb. */
  responseValue: unknown;
  optionalElaboration?: string;
}

/**
 * Long-format responses, one canonical row per (session, question) —
 * enforced by a real `UNIQUE(session_id, question_id)` constraint, not an
 * application-level row-ref/scan convention. Every save is a genuine
 * Postgres upsert (`ON CONFLICT ... DO UPDATE`): the duplicate-row class
 * of bug the Google Sheets backend needed several hand-rolled defenses
 * against is structurally impossible here.
 */
export class ResponseRepository {
  constructor(private readonly client: SupabaseClient | null) {}

  async upsert(input: UpsertResponseInput): Promise<ResponseRecord> {
    const [result] = await this.upsertMany([input]);
    return result;
  }

  /** One round trip regardless of how many answers changed. */
  async upsertMany(inputs: UpsertResponseInput[]): Promise<ResponseRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date().toISOString();

    if (!this.client) {
      const db = getInMemoryDb();
      return inputs.map((input) => {
        const index = db.responses.findIndex(
          (r) =>
            r.sessionId === input.sessionId && r.questionId === input.questionId
        );
        if (index >= 0) {
          const updated: ResponseRecord = {
            ...db.responses[index],
            questionVersion: input.questionVersion,
            construct: input.construct,
            responseType: input.responseType,
            responseValue: input.responseValue,
            optionalElaboration: input.optionalElaboration ?? null,
            updatedAt: now,
          };
          db.responses[index] = updated;
          return updated;
        }
        const created: ResponseRecord = {
          id: randomUUID(),
          sessionId: input.sessionId,
          participantId: input.participantId,
          questionId: input.questionId,
          questionVersion: input.questionVersion,
          construct: input.construct,
          responseType: input.responseType,
          responseValue: input.responseValue,
          optionalElaboration: input.optionalElaboration ?? null,
          createdAt: now,
          updatedAt: now,
        };
        db.responses.push(created);
        return created;
      });
    }

    const { data, error } = await this.client
      .from("responses")
      .upsert(
        inputs.map((input) => ({
          session_id: input.sessionId,
          participant_id: input.participantId,
          question_id: input.questionId,
          question_version: input.questionVersion,
          construct: input.construct,
          response_type: input.responseType,
          response_value: input.responseValue,
          optional_elaboration: input.optionalElaboration ?? null,
          updated_at: now,
        })),
        { onConflict: "session_id,question_id" }
      )
      .select("*");
    throwIfError(error, "upsert responses");
    return (data ?? []).map(rowToResponse);
  }

  async listBySession(sessionId: string): Promise<ResponseRecord[]> {
    if (!this.client) {
      return getInMemoryDb().responses.filter((r) => r.sessionId === sessionId);
    }
    const { data, error } = await this.client
      .from("responses")
      .select("*")
      .eq("session_id", sessionId);
    throwIfError(error, "list responses by session");
    return (data ?? []).map(rowToResponse);
  }

  /** For the researcher's question/construct view. */
  async listByQuestion(questionId: string): Promise<ResponseRecord[]> {
    if (!this.client) {
      return getInMemoryDb().responses.filter(
        (r) => r.questionId === questionId
      );
    }
    const { data, error } = await this.client
      .from("responses")
      .select("*")
      .eq("question_id", questionId);
    throwIfError(error, "list responses by question");
    return (data ?? []).map(rowToResponse);
  }

  /**
   * Part of the withdrawal workflow: overwrites response content rather
   * than deleting rows.
   */
  async withdrawSession(sessionId: string): Promise<number> {
    if (!this.client) {
      const db = getInMemoryDb();
      let count = 0;
      db.responses = db.responses.map((r) => {
        if (r.sessionId !== sessionId) return r;
        count += 1;
        return {
          ...r,
          responseValue: "[WITHDRAWN]",
          optionalElaboration: null,
          updatedAt: new Date().toISOString(),
        };
      });
      return count;
    }

    const { data, error } = await this.client
      .from("responses")
      .update({
        response_value: "[WITHDRAWN]",
        optional_elaboration: null,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .select("id");
    throwIfError(error, "withdraw session responses");
    return data?.length ?? 0;
  }
}
