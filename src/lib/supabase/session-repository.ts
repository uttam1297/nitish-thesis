import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DatabaseError, throwIfError } from "@/lib/supabase/db-errors";
import { getInMemoryDb } from "@/lib/supabase/in-memory-db";
import type {
  ResponseMode,
  SessionRecord,
  StudyStage,
} from "@/lib/supabase/records";
import { rowToSession } from "@/lib/supabase/row-mappers";
import {
  generateResumeToken,
  hashResumeToken,
  resumeTokenHashesMatch,
} from "@/lib/supabase/resume-token";

/** Postgres's unique_violation error code. */
const UNIQUE_VIOLATION = "23505";

/**
 * Server-derived, never client-supplied. Defaults to "pilot" so real data
 * collection must be an explicit opt-in (`STUDY_STAGE=main`).
 */
export function currentStudyStage(): StudyStage {
  return process.env.STUDY_STAGE === "main" ? "main" : "pilot";
}

/**
 * One row per interview session. Resume is by hashed token via a unique
 * indexed column — never by participant id or row position, so a
 * participant can never enumerate or resume someone else's session.
 */
export class SessionRepository {
  constructor(private readonly client: SupabaseClient | null) {}

  async create(input: {
    participantId: string;
    questionnaireVersionId: string;
    questionnaireVersion: string;
    responseMode: ResponseMode;
    firstQuestionId: string;
    /** Idempotency key — see `findByClientRequestId`. */
    clientRequestId?: string;
  }): Promise<{ session: SessionRecord; resumeToken: string }> {
    const resumeToken = generateResumeToken();
    const resumeTokenHash = hashResumeToken(resumeToken);
    const now = new Date().toISOString();

    if (!this.client) {
      if (input.clientRequestId) {
        const existing = getInMemoryDb().sessions.find(
          (s) => s.clientRequestId === input.clientRequestId
        );
        if (existing) return { session: existing, resumeToken };
      }
      const record: SessionRecord = {
        id: randomUUID(),
        participantId: input.participantId,
        questionnaireVersionId: input.questionnaireVersionId,
        questionnaireVersion: input.questionnaireVersion,
        resumeTokenHash,
        responseMode: input.responseMode,
        status: "started",
        currentQuestionId: input.firstQuestionId,
        progressPercentage: 0,
        studyStage: currentStudyStage(),
        clientRequestId: input.clientRequestId ?? null,
        startedAt: now,
        lastActivityAt: now,
        completedAt: null,
        withdrawnAt: null,
      };
      getInMemoryDb().sessions.push(record);
      return { session: record, resumeToken };
    }

    const { data, error } = await this.client
      .from("sessions")
      .insert({
        participant_id: input.participantId,
        questionnaire_version_id: input.questionnaireVersionId,
        questionnaire_version: input.questionnaireVersion,
        resume_token_hash: resumeTokenHash,
        response_mode: input.responseMode,
        status: "started",
        current_question_id: input.firstQuestionId,
        progress_percentage: 0,
        study_stage: currentStudyStage(),
        client_request_id: input.clientRequestId ?? null,
        started_at: now,
        last_activity_at: now,
      })
      .select("*")
      .single();

    if (error?.code === UNIQUE_VIOLATION && input.clientRequestId) {
      // Idempotent replay: this exact client request already created a
      // session. Reattach instead of failing the retry.
      const existing = await this.findByClientRequestId(input.clientRequestId);
      if (existing) {
        const rotated = await this.rotateResumeToken(existing.id);
        return {
          session: { ...existing, resumeTokenHash: hashResumeToken(rotated) },
          resumeToken: rotated,
        };
      }
    }
    throwIfError(error, "insert session");
    return { session: rowToSession(data), resumeToken };
  }

  async findByResumeToken(token: string): Promise<SessionRecord | null> {
    const targetHash = hashResumeToken(token);

    if (!this.client) {
      return (
        getInMemoryDb().sessions.find((s) =>
          resumeTokenHashesMatch(s.resumeTokenHash, targetHash)
        ) ?? null
      );
    }

    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("resume_token_hash", targetHash)
      .maybeSingle();
    throwIfError(error, "find session by resume token");
    return data ? rowToSession(data) : null;
  }

  async findByClientRequestId(
    clientRequestId: string
  ): Promise<SessionRecord | null> {
    if (!this.client) {
      return (
        getInMemoryDb().sessions.find(
          (s) => s.clientRequestId === clientRequestId
        ) ?? null
      );
    }
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("client_request_id", clientRequestId)
      .maybeSingle();
    throwIfError(error, "find session by client request id");
    return data ? rowToSession(data) : null;
  }

  async getById(sessionId: string): Promise<SessionRecord | null> {
    if (!this.client) {
      return getInMemoryDb().sessions.find((s) => s.id === sessionId) ?? null;
    }
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    throwIfError(error, "get session");
    return data ? rowToSession(data) : null;
  }

  /**
   * Issues a fresh resume token and invalidates the old one. Used when a
   * creation retry finds the original attempt already succeeded but its
   * response (and token) never reached the browser.
   */
  async rotateResumeToken(sessionId: string): Promise<string> {
    const resumeToken = generateResumeToken();
    const resumeTokenHash = hashResumeToken(resumeToken);

    if (!this.client) {
      const db = getInMemoryDb();
      const index = db.sessions.findIndex((s) => s.id === sessionId);
      if (index === -1) throw new DatabaseError("Session not found.");
      db.sessions[index] = { ...db.sessions[index], resumeTokenHash };
      return resumeToken;
    }

    const { error } = await this.client
      .from("sessions")
      .update({ resume_token_hash: resumeTokenHash })
      .eq("id", sessionId);
    throwIfError(error, "rotate resume token");
    return resumeToken;
  }

  async updateProgress(
    sessionId: string,
    patch: { currentQuestionId: string; progressPercentage: number }
  ): Promise<void> {
    const now = new Date().toISOString();

    if (!this.client) {
      const db = getInMemoryDb();
      const index = db.sessions.findIndex((s) => s.id === sessionId);
      if (index === -1) return;
      const current = db.sessions[index];
      db.sessions[index] = {
        ...current,
        currentQuestionId: patch.currentQuestionId,
        progressPercentage: patch.progressPercentage,
        status: current.status === "started" ? "in_progress" : current.status,
        lastActivityAt: now,
      };
      return;
    }

    // Only bump "started" -> "in_progress"; never downgrade a session that
    // has already moved further (completed/withdrawn) via a late sync.
    const current = await this.getById(sessionId);
    if (!current) return;
    const nextStatus =
      current.status === "started" ? "in_progress" : current.status;

    const { error } = await this.client
      .from("sessions")
      .update({
        current_question_id: patch.currentQuestionId,
        progress_percentage: patch.progressPercentage,
        status: nextStatus,
        last_activity_at: now,
      })
      .eq("id", sessionId);
    throwIfError(error, "update session progress");
  }

  /**
   * Idempotent: completing an already-completed session is a no-op that
   * still reports success, so a retried submit never double-transitions.
   */
  async markCompleted(
    sessionId: string
  ): Promise<{ alreadyCompleted: boolean }> {
    const now = new Date().toISOString();

    if (!this.client) {
      const db = getInMemoryDb();
      const index = db.sessions.findIndex((s) => s.id === sessionId);
      if (index === -1) throw new DatabaseError("Session not found.");
      if (db.sessions[index].status === "completed") {
        return { alreadyCompleted: true };
      }
      db.sessions[index] = {
        ...db.sessions[index],
        status: "completed",
        completedAt: now,
        lastActivityAt: now,
      };
      return { alreadyCompleted: false };
    }

    // Atomic: only transitions rows that are not already completed.
    // `select` after an `update ... where status <> 'completed'` tells us
    // whether *this* call was the one that completed it.
    const { data, error } = await this.client
      .from("sessions")
      .update({ status: "completed", completed_at: now, last_activity_at: now })
      .eq("id", sessionId)
      .neq("status", "completed")
      .select("id");
    throwIfError(error, "mark session completed");

    if (data && data.length > 0) return { alreadyCompleted: false };

    const existing = await this.getById(sessionId);
    if (!existing) throw new DatabaseError("Session not found.");
    return { alreadyCompleted: true };
  }

  async markWithdrawn(sessionId: string): Promise<void> {
    const now = new Date().toISOString();

    if (!this.client) {
      const db = getInMemoryDb();
      const index = db.sessions.findIndex((s) => s.id === sessionId);
      if (index === -1) throw new DatabaseError("Session not found.");
      db.sessions[index] = {
        ...db.sessions[index],
        status: "withdrawn",
        withdrawnAt: now,
        lastActivityAt: now,
      };
      return;
    }

    const { error } = await this.client
      .from("sessions")
      .update({ status: "withdrawn", withdrawn_at: now, last_activity_at: now })
      .eq("id", sessionId);
    throwIfError(error, "mark session withdrawn");
  }

  /** Admin overview/list only — not on the participant save path. */
  async listAll(): Promise<SessionRecord[]> {
    if (!this.client) return [...getInMemoryDb().sessions];
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .order("started_at", { ascending: false });
    throwIfError(error, "list sessions");
    return (data ?? []).map(rowToSession);
  }
}
