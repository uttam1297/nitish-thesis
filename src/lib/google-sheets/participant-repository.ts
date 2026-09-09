import "server-only";

import { randomUUID } from "node:crypto";

import {
  participantRecordSchema,
  type ParticipantRecord,
} from "@/lib/google-sheets/records";
import {
  participantToRow,
  rowToParticipant,
} from "@/lib/google-sheets/row-mappers";
import {
  PARTICIPANT_HEADERS,
  SHEET_NAMES,
} from "@/lib/google-sheets/sheet-schema";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

export interface NewParticipantProfile {
  role: string;
  industry: string;
  experience: string;
  closenessToDiscovery: string;
}

/**
 * One row per participant, keyed by an internal UUID (never a guessable
 * sequential id — see `resume-token.ts` for why identity and the resume
 * credential are kept separate).
 */
export class ParticipantRepository {
  constructor(private readonly client: SheetsClient) {}

  async create(profile: NewParticipantProfile): Promise<ParticipantRecord> {
    await this.client.ensureSheet(SHEET_NAMES.participants, [
      ...PARTICIPANT_HEADERS,
    ]);
    const record = participantRecordSchema.parse({
      participantId: randomUUID(),
      role: profile.role,
      industry: profile.industry,
      experience: profile.experience,
      closenessToDiscovery: profile.closenessToDiscovery,
      createdAt: new Date().toISOString(),
    });
    await this.client.appendRow(
      SHEET_NAMES.participants,
      participantToRow(record)
    );
    return record;
  }

  /** Full-sheet read: fine here because it is admin-only and infrequent. */
  async listAll(): Promise<ParticipantRecord[]> {
    const rows = await this.client.readRange(SHEET_NAMES.participants, "A2:ZZ");
    return rows
      .filter((row) => row.some((cell) => cell !== ""))
      .map(rowToParticipant);
  }
}
