import { describe, expect, it } from "vitest";

import {
  databaseRelationships,
  getFieldMetadata,
  getRelationshipsForTable,
  getTableMetadata,
  logicalRelationships,
  schemaCatalogue,
} from "./schema-catalogue";

describe("static schema catalogue", () => {
  it("contains exactly the six research tables", () => {
    expect(Object.keys(schemaCatalogue)).toEqual([
      "studies",
      "questionnaire_versions",
      "participants",
      "sessions",
      "responses",
      "consents",
    ]);
  });

  it.each([
    ["studies", ["id", "slug", "title", "is_active", "created_at"]],
    [
      "questionnaire_versions",
      [
        "id",
        "study_id",
        "version",
        "consent_version",
        "is_active",
        "created_at",
      ],
    ],
    [
      "participants",
      [
        "id",
        "participant_code",
        "role",
        "industry",
        "experience",
        "closeness_to_discovery",
        "created_at",
      ],
    ],
    [
      "sessions",
      [
        "id",
        "participant_id",
        "questionnaire_version_id",
        "questionnaire_version",
        "resume_token_hash",
        "response_mode",
        "status",
        "current_question_id",
        "progress_percentage",
        "study_stage",
        "client_request_id",
        "started_at",
        "last_activity_at",
        "completed_at",
        "withdrawn_at",
      ],
    ],
    [
      "responses",
      [
        "id",
        "session_id",
        "participant_id",
        "question_id",
        "question_version",
        "construct",
        "response_type",
        "response_value",
        "optional_elaboration",
        "created_at",
        "updated_at",
      ],
    ],
    [
      "consents",
      [
        "id",
        "session_id",
        "participant_id",
        "consent_version",
        "participation_consent",
        "voice_input_consent",
        "recording_consent",
        "consented_at",
      ],
    ],
  ] as const)("covers every %s field in migration order", (table, fields) => {
    expect(getTableMetadata(table).fields.map((field) => field.name)).toEqual(
      fields
    );
  });

  it("captures important migration types, nullability, and defaults", () => {
    expect(getFieldMetadata("responses", "response_value")).toMatchObject({
      type: "jsonb",
      nullable: false,
    });
    expect(getFieldMetadata("sessions", "client_request_id")).toMatchObject({
      type: "text",
      nullable: true,
    });
    expect(getFieldMetadata("sessions", "study_stage")?.default).toBe(
      "'pilot'"
    );
    expect(
      getFieldMetadata("participants", "participant_code")?.default
    ).toContain("participant_code_seq");
  });

  it("marks credential derivatives, idempotency keys, and UUIDs as never public", () => {
    expect(getFieldMetadata("sessions", "resume_token_hash")).toMatchObject({
      visibility: "Technical/Internal Only",
      publicVisibility: "never",
      securityClassification: "credential-derivative",
    });
    expect(getFieldMetadata("sessions", "client_request_id")).toMatchObject({
      visibility: "Technical/Internal Only",
      publicVisibility: "never",
      securityClassification: "operational-sensitive",
    });
    expect(getFieldMetadata("participants", "id")).toMatchObject({
      publicVisibility: "never",
      securityClassification: "internal-identifier",
    });
  });

  it("documents key unique and check constraints", () => {
    expect(getTableMetadata("responses").uniqueConstraints).toContainEqual({
      fields: ["session_id", "question_id"],
      meaning: "A session has one canonical row per question.",
    });
    expect(
      getTableMetadata("sessions").checkConstraints.map(
        (constraint) => constraint.expression
      )
    ).toContain("study_stage IN ('pilot', 'main')");
  });
});

describe("relationship catalogue", () => {
  it("contains all seven migration-enforced foreign keys", () => {
    expect(databaseRelationships).toHaveLength(7);
    expect(
      databaseRelationships.map((relationship) => relationship.technicalLabel)
    ).toEqual([
      "questionnaire_versions.study_id → studies.id",
      "sessions.participant_id → participants.id",
      "sessions.questionnaire_version_id → questionnaire_versions.id",
      "responses.session_id → sessions.id",
      "responses.participant_id → participants.id",
      "consents.session_id → sessions.id",
      "consents.participant_id → participants.id",
    ]);
    expect(
      databaseRelationships.every(
        (relationship) => relationship.enforcement === "database-foreign-key"
      )
    ).toBe(true);
  });

  it("finds both incoming and outgoing relationships for a table", () => {
    expect(
      getRelationshipsForTable("participants").map(
        (relationship) => relationship.id
      )
    ).toEqual([
      "session-participant",
      "response-participant",
      "consent-participant",
    ]);
  });

  it("keeps application expectations distinct from SQL foreign keys", () => {
    expect(logicalRelationships).toHaveLength(7);
    expect(
      logicalRelationships.every(
        (relationship) =>
          relationship.enforcement === "logical-application-expectation"
      )
    ).toBe(true);
    expect(
      logicalRelationships.map((relationship) => relationship.id)
    ).toContain("profile-response-mirrors");
  });
});
