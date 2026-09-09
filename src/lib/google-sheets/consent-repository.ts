import "server-only";

import { randomUUID } from "node:crypto";

import {
  consentRecordSchema,
  type ConsentRecord,
} from "@/lib/google-sheets/records";
import { consentToRow, rowToConsent } from "@/lib/google-sheets/row-mappers";
import { CONSENT_HEADERS, SHEET_NAMES } from "@/lib/google-sheets/sheet-schema";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

export interface RecordConsentInput {
  participantId: string;
  sessionId: string;
  consentVersion: string;
  participationConsent: boolean;
  /**
   * Voice-input consent (typed vs. spoken answers) and live-call recording
   * consent are deliberately separate fields: agreeing to speak an answer
   * into a text box is not the same as agreeing to be recorded on a call.
   */
  voiceInputConsent: boolean;
  recordingConsent: boolean;
}

/** One append-only row per session. Consent is never edited in place. */
export class ConsentRepository {
  constructor(private readonly client: SheetsClient) {}

  async record(input: RecordConsentInput): Promise<ConsentRecord> {
    await this.client.ensureSheet(SHEET_NAMES.consent, [...CONSENT_HEADERS]);
    const record = consentRecordSchema.parse({
      consentId: randomUUID(),
      participantId: input.participantId,
      sessionId: input.sessionId,
      consentVersion: input.consentVersion,
      participationConsent: input.participationConsent,
      voiceInputConsent: input.voiceInputConsent,
      recordingConsent: input.recordingConsent,
      consentedAt: new Date().toISOString(),
    });
    await this.client.appendRow(SHEET_NAMES.consent, consentToRow(record));
    return record;
  }

  async listBySession(sessionId: string): Promise<ConsentRecord[]> {
    const rows = await this.client.readRange(SHEET_NAMES.consent, "A2:ZZ");
    return rows
      .filter((row) => row.some((cell) => cell !== ""))
      .map(rowToConsent)
      .filter((record) => record.sessionId === sessionId);
  }
}
