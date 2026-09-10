import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError } from "@/lib/supabase/db-errors";
import { getInMemoryDb } from "@/lib/supabase/in-memory-db";
import type { ConsentRecord } from "@/lib/supabase/records";
import { rowToConsent } from "@/lib/supabase/row-mappers";

export interface RecordConsentInput {
  sessionId: string;
  participantId: string;
  consentVersion: string;
  participationConsent: boolean;
  /**
   * Voice-input consent (typed vs. spoken answers) and live-call recording
   * consent are deliberately separate: agreeing to speak an answer into a
   * text box is not the same as agreeing to be recorded on a call.
   */
  voiceInputConsent: boolean;
  recordingConsent: boolean;
}

/** Append-only: consent is never edited in place. */
export class ConsentRepository {
  constructor(private readonly client: SupabaseClient | null) {}

  async record(input: RecordConsentInput): Promise<ConsentRecord> {
    const now = new Date().toISOString();

    if (!this.client) {
      const record: ConsentRecord = {
        id: randomUUID(),
        sessionId: input.sessionId,
        participantId: input.participantId,
        consentVersion: input.consentVersion,
        participationConsent: input.participationConsent,
        voiceInputConsent: input.voiceInputConsent,
        recordingConsent: input.recordingConsent,
        consentedAt: now,
      };
      getInMemoryDb().consents.push(record);
      return record;
    }

    const { data, error } = await this.client
      .from("consents")
      .insert({
        session_id: input.sessionId,
        participant_id: input.participantId,
        consent_version: input.consentVersion,
        participation_consent: input.participationConsent,
        voice_input_consent: input.voiceInputConsent,
        recording_consent: input.recordingConsent,
        consented_at: now,
      })
      .select("*")
      .single();
    throwIfError(error, "insert consent");
    return rowToConsent(data);
  }

  async listBySession(sessionId: string): Promise<ConsentRecord[]> {
    if (!this.client) {
      return getInMemoryDb().consents.filter((c) => c.sessionId === sessionId);
    }
    const { data, error } = await this.client
      .from("consents")
      .select("*")
      .eq("session_id", sessionId);
    throwIfError(error, "list consents by session");
    return (data ?? []).map(rowToConsent);
  }
}
