import { beforeEach, describe, expect, it, vi } from "vitest";

import { QUESTIONNAIRE_VERSION } from "@/config/interview";
import { ConsentRepository } from "@/lib/supabase/consent-repository";
import { getInMemoryDb, resetInMemoryDb } from "@/lib/supabase/in-memory-db";
import { ParticipantRepository } from "@/lib/supabase/participant-repository";
import { resolveQuestionnaireVersion } from "@/lib/supabase/questionnaire-version";
import { ResponseRepository } from "@/lib/supabase/response-repository";
import { SessionRepository } from "@/lib/supabase/session-repository";
import { StudyRepository } from "@/lib/supabase/study-repository";

function makeRepositories() {
  return {
    participants: new ParticipantRepository(null),
    sessions: new SessionRepository(null),
    responses: new ResponseRepository(null),
    consent: new ConsentRepository(null),
    study: new StudyRepository(null),
  };
}

beforeEach(() => {
  resetInMemoryDb();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("questionnaire version resolution for a new session", () => {
  it("uses the active version when the browser is up to date", async () => {
    const version = await resolveQuestionnaireVersion(
      makeRepositories(),
      QUESTIONNAIRE_VERSION
    );
    expect(version.version).toBe(QUESTIONNAIRE_VERSION);
  });

  it("accepts a superseded version this build still serves", async () => {
    const db = getInMemoryDb();
    // The row exists because that questionnaire really was published.
    db.questionnaireVersions.push({
      ...db.questionnaireVersions[0],
      id: "00000000-0000-4000-8000-000000000001",
      version: "1.3.0",
      isActive: false,
    });

    const version = await resolveQuestionnaireVersion(
      makeRepositories(),
      "1.3.0"
    );

    // A participant holding a 1.3.0 draft keeps answering 1.3.0 rather than
    // being locked out of starting a session at all.
    expect(version.version).toBe("1.3.0");
  });

  it("refuses a version this build no longer serves", async () => {
    await expect(
      resolveQuestionnaireVersion(makeRepositories(), "0.9.0")
    ).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a served version that was never published to this database", async () => {
    await expect(
      resolveQuestionnaireVersion(makeRepositories(), "1.3.0")
    ).rejects.toMatchObject({ status: 409 });
  });

  it("recovers when the active version's row was never migrated in", async () => {
    const db = getInMemoryDb();
    db.questionnaireVersions = [
      { ...db.questionnaireVersions[0], version: "1.3.0", isActive: true },
    ];

    const version = await resolveQuestionnaireVersion(
      makeRepositories(),
      QUESTIONNAIRE_VERSION
    );

    // This is the production 500: the configured version had no row.
    expect(version.version).toBe(QUESTIONNAIRE_VERSION);
    expect(version.isActive).toBe(true);
  });
});
