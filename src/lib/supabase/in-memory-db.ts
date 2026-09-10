import "server-only";

import { randomUUID } from "node:crypto";

import type {
  ConsentRecord,
  ParticipantRecord,
  QuestionnaireVersionRecord,
  ResponseRecord,
  SessionRecord,
} from "@/lib/supabase/records";
import { QUESTIONNAIRE_VERSION } from "@/config/interview";
import { CONSENT_VERSION } from "@/config/study";

/**
 * Fallback data store used when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
 * are absent — local dev and CI without a real Supabase project. On
 * `globalThis` for the same reason as the service client: a module-level
 * `let` can end up duplicated across server chunks.
 */
interface InMemoryTables {
  questionnaireVersions: QuestionnaireVersionRecord[];
  participants: ParticipantRecord[];
  sessions: SessionRecord[];
  responses: ResponseRecord[];
  consents: ConsentRecord[];
  participantCodeCounter: number;
}

const globalForDb = globalThis as unknown as { __inMemoryDb?: InMemoryTables };

function seedQuestionnaireVersion(): QuestionnaireVersionRecord {
  return {
    id: randomUUID(),
    studyId: randomUUID(),
    version: QUESTIONNAIRE_VERSION,
    consentVersion: CONSENT_VERSION,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

export function getInMemoryDb(): InMemoryTables {
  if (!globalForDb.__inMemoryDb) {
    globalForDb.__inMemoryDb = {
      questionnaireVersions: [seedQuestionnaireVersion()],
      participants: [],
      sessions: [],
      responses: [],
      consents: [],
      participantCodeCounter: 0,
    };
  }
  return globalForDb.__inMemoryDb;
}

export function nextParticipantCode(): string {
  const db = getInMemoryDb();
  db.participantCodeCounter += 1;
  return `P${String(db.participantCodeCounter).padStart(3, "0")}`;
}

/** Test-only: start every table empty again. */
export function resetInMemoryDb(): void {
  globalForDb.__inMemoryDb = undefined;
}
