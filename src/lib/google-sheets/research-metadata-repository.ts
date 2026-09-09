import "server-only";

import { QUESTIONNAIRE_VERSION } from "@/config/interview";
import { CONSENT_VERSION, studyTitle } from "@/config/study";
import {
  researchMetadataRecordSchema,
  type ResearchMetadataRecord,
} from "@/lib/google-sheets/records";
import {
  researchMetadataToRow,
  rowToResearchMetadata,
} from "@/lib/google-sheets/row-mappers";
import {
  RESEARCH_METADATA_HEADERS,
  SHEET_NAMES,
} from "@/lib/google-sheets/sheet-schema";
import type { SheetsClient } from "@/lib/google-sheets/sheets-client";

/** The one active-study row always lives at row 2 (row 1 is headers). */
const ACTIVE_STUDY_ROW = 2;

/**
 * Preserves questionnaire/consent version alongside a lazily-allocated
 * sequential participant counter. `allocateParticipantNumber` is a
 * read-increment-write on a single cell: safe enough at thesis scale, but
 * not a real atomic counter — see README "known limitations". It is used
 * only for the human-readable research label, never as a security
 * credential (resume tokens are, see `resume-token.ts`).
 */
export class ResearchMetadataRepository {
  constructor(private readonly client: SheetsClient) {}

  async getOrCreateActiveStudy(): Promise<ResearchMetadataRecord> {
    await this.client.ensureSheet(SHEET_NAMES.researchMetadata, [
      ...RESEARCH_METADATA_HEADERS,
    ]);
    const existing = await this.client.readRow(
      SHEET_NAMES.researchMetadata,
      ACTIVE_STUDY_ROW
    );
    if (existing.length > 0 && existing[0]) {
      return researchMetadataRecordSchema.parse(
        rowToResearchMetadata(existing)
      );
    }

    const created: ResearchMetadataRecord = researchMetadataRecordSchema.parse({
      studyId: "thesis-b2c-ai-discovery",
      studyTitle,
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      consentVersion: CONSENT_VERSION,
      createdAt: new Date().toISOString(),
      isActive: true,
      nextParticipantNumber: 1,
    });
    await this.client.updateRow(
      SHEET_NAMES.researchMetadata,
      ACTIVE_STUDY_ROW,
      researchMetadataToRow(created)
    );
    return created;
  }

  /** Returns e.g. "P007" and advances the counter. See class doc for caveat. */
  async allocateParticipantNumber(): Promise<string> {
    const active = await this.getOrCreateActiveStudy();
    const code = `P${String(active.nextParticipantNumber).padStart(3, "0")}`;
    const updated = researchMetadataRecordSchema.parse({
      ...active,
      nextParticipantNumber: active.nextParticipantNumber + 1,
    });
    await this.client.updateRow(
      SHEET_NAMES.researchMetadata,
      ACTIVE_STUDY_ROW,
      researchMetadataToRow(updated)
    );
    return code;
  }
}
