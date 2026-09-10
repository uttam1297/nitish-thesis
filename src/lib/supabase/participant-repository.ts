import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { throwIfError } from "@/lib/supabase/db-errors";
import {
  getInMemoryDb,
  nextParticipantCode,
} from "@/lib/supabase/in-memory-db";
import type { ParticipantRecord } from "@/lib/supabase/records";
import { rowToParticipant } from "@/lib/supabase/row-mappers";

export interface NewParticipantProfile {
  role: string;
  industry: string;
  experience: string;
  closenessToDiscovery: string;
}

/**
 * One row per participant, keyed by an internal UUID (never a guessable
 * sequential id). `participant_code` (P001…) is assigned atomically by a
 * Postgres sequence at insert time — genuinely safe under concurrency,
 * unlike the Google Sheets backend's documented read-increment-write
 * limitation.
 */
export class ParticipantRepository {
  constructor(private readonly client: SupabaseClient | null) {}

  async create(profile: NewParticipantProfile): Promise<ParticipantRecord> {
    if (!this.client) {
      const record: ParticipantRecord = {
        id: randomUUID(),
        participantCode: nextParticipantCode(),
        role: profile.role,
        industry: profile.industry,
        experience: profile.experience,
        closenessToDiscovery: profile.closenessToDiscovery,
        createdAt: new Date().toISOString(),
      };
      getInMemoryDb().participants.push(record);
      return record;
    }

    const { data, error } = await this.client
      .from("participants")
      .insert({
        role: profile.role,
        industry: profile.industry,
        experience: profile.experience,
        closeness_to_discovery: profile.closenessToDiscovery,
      })
      .select("*")
      .single();
    throwIfError(error, "insert participant");
    return rowToParticipant(data);
  }

  async getById(participantId: string): Promise<ParticipantRecord | null> {
    if (!this.client) {
      return (
        getInMemoryDb().participants.find((p) => p.id === participantId) ?? null
      );
    }
    const { data, error } = await this.client
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .maybeSingle();
    throwIfError(error, "get participant");
    return data ? rowToParticipant(data) : null;
  }

  /** Admin-only, infrequent: full list for the session table's join. */
  async listAll(): Promise<ParticipantRecord[]> {
    if (!this.client) return [...getInMemoryDb().participants];
    const { data, error } = await this.client.from("participants").select("*");
    throwIfError(error, "list participants");
    return (data ?? []).map(rowToParticipant);
  }
}
