import type {
  DatabaseRelationshipMetadata,
  FieldMetadata,
  LogicalRelationshipMetadata,
  ResearchTableName,
  TableMetadata,
} from "./schema-types";

const internalId = (
  name: string,
  meaning: string,
  source?: string,
): FieldMetadata => ({
  name,
  type: "uuid",
  nullable: false,
  ...(source ? { source } : {}),
  meaning,
  visibility: "Technical/Internal Only",
  publicVisibility: "never",
  securityClassification: "internal-identifier",
});

const tableCatalogue = [
  {
    name: "studies",
    purpose: "Identifies each research study and whether it is active.",
    primaryKey: "id",
    fields: [
      {
        ...internalId("id", "Primary identifier for the study."),
        default: "gen_random_uuid()",
      },
      {
        name: "slug",
        type: "text",
        nullable: false,
        source: "Seed migration",
        meaning: "Stable machine-readable study identifier.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "title",
        type: "text",
        nullable: false,
        source: "Seed migration and study configuration",
        meaning: "Human-readable research study title.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
      },
      {
        name: "is_active",
        type: "boolean",
        nullable: false,
        default: "true",
        meaning: "Whether the study is available for active use.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When the study row was created.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
    ],
    foreignKeys: [],
    uniqueConstraints: [
      { fields: ["slug"], meaning: "A study slug identifies one study." },
    ],
    checkConstraints: [],
    caveats: ["RLS is enabled with no anon or authenticated policies."],
  },
  {
    name: "questionnaire_versions",
    purpose:
      "Records questionnaire and consent versions available for each study.",
    primaryKey: "id",
    fields: [
      {
        ...internalId(
          "id",
          "Primary identifier referenced by sessions.",
        ),
        default: "gen_random_uuid()",
      },
      internalId("study_id", "Study that owns this questionnaire version."),
      {
        name: "version",
        type: "text",
        nullable: false,
        source: "Questionnaire version migrations",
        meaning: "Semantic version of the questionnaire wording and routing.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
      },
      {
        name: "consent_version",
        type: "text",
        nullable: false,
        source: "Questionnaire version migrations",
        meaning: "Consent wording version paired with this questionnaire.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "is_active",
        type: "boolean",
        nullable: false,
        default: "true",
        meaning: "Whether new sessions should use this version.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When this version row was created.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
    ],
    foreignKeys: ["questionnaire-version-study"],
    uniqueConstraints: [
      {
        fields: ["study_id", "version"],
        meaning: "A semantic version occurs once within a study.",
      },
    ],
    checkConstraints: [],
    caveats: [
      "The database does not enforce that only one version is active.",
      "RLS is enabled with no anon or authenticated policies.",
    ],
  },
  {
    name: "participants",
    purpose:
      "Stores one pseudonymous participant and formatted profile answers.",
    primaryKey: "id",
    fields: [
      {
        ...internalId("id", "Internal participant identifier."),
        default: "gen_random_uuid()",
      },
      {
        name: "participant_code",
        type: "text",
        nullable: false,
        default:
          "'P' || lpad(nextval('participant_code_seq')::text, 3, '0')",
        source: "Database sequence",
        meaning: "Pseudonymous human-facing research label such as P007.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
        caveats: ["This is a research label, not a login credential."],
      },
      {
        name: "role",
        type: "text",
        nullable: false,
        default: "''",
        source: "Formatted Q1 selected labels",
        meaning: "Participant's professional responsibility profile.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
        caveats: [
          "This formatted mirror is not the canonical raw Q1 response.",
        ],
      },
      {
        name: "industry",
        type: "text",
        nullable: false,
        default: "''",
        source: "Formatted Q2 selected label or Other text",
        meaning: "Participant's primary industry or B2C sector.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
        caveats: [
          "The column is unconstrained text even though questionnaire 1.3.0 uses a select-with-Other question.",
        ],
      },
      {
        name: "experience",
        type: "text",
        nullable: false,
        default: "''",
        source: "Formatted Q3 selected label",
        meaning: "Participant's relevant professional experience band.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "closeness_to_discovery",
        type: "text",
        nullable: false,
        default: "''",
        source: "Formatted Q4 scale value",
        meaning: "How closely the participant's role relates to discovery.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
        caveats: ["A 1–5 scale value is stored as text."],
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When the participant row was created.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
    ],
    foreignKeys: [],
    uniqueConstraints: [
      {
        fields: ["participant_code"],
        meaning: "Each pseudonymous participant code is unique.",
      },
    ],
    checkConstraints: [],
    caveats: [
      "Q1–Q4 response rows are canonical for raw questionnaire semantics.",
      "RLS is enabled with no anon or authenticated policies.",
    ],
  },
  {
    name: "sessions",
    purpose: "Stores one interview attempt and its operational progress.",
    primaryKey: "id",
    fields: [
      {
        ...internalId("id", "Primary interview-session identifier."),
        default: "gen_random_uuid()",
      },
      internalId("participant_id", "Participant who owns this session."),
      internalId(
        "questionnaire_version_id",
        "Questionnaire-version row used by this session.",
      ),
      {
        name: "questionnaire_version",
        type: "text",
        nullable: false,
        source: "Denormalized questionnaire_versions.version",
        meaning: "Questionnaire version used for the session.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
      },
      {
        name: "resume_token_hash",
        type: "text",
        nullable: false,
        source: "SHA-256 of the participant's raw resume token",
        meaning: "Credential derivative used to authenticate resume requests.",
        visibility: "Technical/Internal Only",
        publicVisibility: "never",
        securityClassification: "credential-derivative",
        caveats: ["Never display, log, export, or treat this as research data."],
      },
      {
        name: "response_mode",
        type: "text",
        nullable: false,
        meaning: "Whether the interview used the form or a live interview.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "status",
        type: "text",
        nullable: false,
        default: "'started'",
        meaning: "Current lifecycle state of the interview attempt.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
        caveats: [
          "Only completed sessions normally belong in the final sample.",
          "Withdrawn sessions have response content scrubbed.",
        ],
      },
      {
        name: "current_question_id",
        type: "text",
        nullable: false,
        default: "''",
        meaning: "Operational resume position in the questionnaire.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "progress_percentage",
        type: "integer",
        nullable: false,
        default: "0",
        meaning: "Operational completion estimate from 0 through 100.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
        caveats: ["Useful for review, but not a research construct."],
      },
      {
        name: "study_stage",
        type: "text",
        nullable: false,
        default: "'pilot'",
        meaning: "Classifies the session as pilot or main-study data.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
        caveats: [
          "Pilot sessions must be excluded from final analysis unless explicitly approved.",
        ],
      },
      {
        name: "client_request_id",
        type: "text",
        nullable: true,
        source: "Client-generated session-creation idempotency key",
        meaning: "Prevents retries from creating duplicate sessions.",
        visibility: "Technical/Internal Only",
        publicVisibility: "never",
        securityClassification: "operational-sensitive",
        caveats: ["Operational only; ignore for research analysis."],
      },
      {
        name: "started_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When the interview attempt started.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "last_activity_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "Most recent persisted participant activity.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "completed_at",
        type: "timestamptz",
        nullable: true,
        meaning: "When the interview was completed, if completed.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "withdrawn_at",
        type: "timestamptz",
        nullable: true,
        meaning: "When the participant withdrew, if applicable.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
    ],
    foreignKeys: ["session-participant", "session-questionnaire-version"],
    uniqueConstraints: [
      {
        fields: ["resume_token_hash"],
        meaning: "A resume credential identifies one session.",
      },
      {
        fields: ["client_request_id"],
        meaning: "A non-null creation idempotency key identifies one session.",
      },
    ],
    checkConstraints: [
      {
        fields: ["response_mode"],
        expression:
          "response_mode IN ('asynchronous_form', 'live_interview')",
        meaning: "Only supported collection modes may be stored.",
      },
      {
        fields: ["status"],
        expression:
          "status IN ('started', 'in_progress', 'completed', 'withdrawn')",
        meaning: "Only supported session lifecycle states may be stored.",
      },
      {
        fields: ["progress_percentage"],
        expression: "progress_percentage BETWEEN 0 AND 100",
        meaning: "Progress remains a valid percentage.",
      },
      {
        fields: ["study_stage"],
        expression: "study_stage IN ('pilot', 'main')",
        meaning: "Each session is classified as pilot or main study.",
      },
    ],
    caveats: [
      "questionnaire_version is denormalized and must agree with the referenced version row.",
      "Completion duration is approximate rather than lab-grade timing.",
      "RLS is enabled with no anon or authenticated policies.",
    ],
  },
  {
    name: "responses",
    purpose:
      "Canonical long-format research dataset with one row per session and question.",
    primaryKey: "id",
    fields: [
      {
        ...internalId("id", "Primary response-row identifier."),
        default: "gen_random_uuid()",
      },
      internalId("session_id", "Session in which the answer was provided."),
      internalId("participant_id", "Participant who provided the answer."),
      {
        name: "question_id",
        type: "text",
        nullable: false,
        source: "Questionnaire metadata",
        meaning: "Stable question identifier such as q7.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
      },
      {
        name: "question_version",
        type: "text",
        nullable: false,
        default: "'1'",
        source: "Interview sync constant",
        meaning: "Version of the individual question definition.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "construct",
        type: "text",
        nullable: false,
        source: "Questionnaire metadata",
        meaning: "Research construct assigned to the question.",
        visibility: "Used for Analytics",
        publicVisibility: "dashboard-only",
      },
      {
        name: "response_type",
        type: "text",
        nullable: false,
        source: "Questionnaire metadata",
        meaning: "Question control and semantic response type.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "response_value",
        type: "jsonb",
        nullable: false,
        source: "Serialized questionnaire AnswerValue",
        meaning: "Canonical raw answer with a shape determined by response_type.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
        caveats: [
          "Narrative text may contain sensitive verbatim research responses.",
          "A withdrawn response is the JSON string \"[WITHDRAWN]\".",
        ],
      },
      {
        name: "optional_elaboration",
        type: "text",
        nullable: true,
        meaning: "Reserved follow-up elaboration, unused by version 1.3.0.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "created_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When the answer row was first created.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When the answer was most recently revised.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
    ],
    foreignKeys: ["response-session", "response-participant"],
    uniqueConstraints: [
      {
        fields: ["session_id", "question_id"],
        meaning: "A session has one canonical row per question.",
      },
    ],
    checkConstraints: [
      {
        fields: ["response_type"],
        expression:
          "response_type IN ('single_select', 'multi_select', 'likert_scale', 'ranking', 'short_text', 'long_text', 'voice_or_text', 'optional_elaboration')",
        meaning: "Only response types supported by the interview engine may be stored.",
      },
    ],
    caveats: [
      "The database does not enforce question, construct, or response-type agreement with questionnaire metadata.",
      "RLS is enabled with no anon or authenticated policies.",
    ],
  },
  {
    name: "consents",
    purpose: "Append-only consent history for each interview session.",
    primaryKey: "id",
    fields: [
      {
        ...internalId("id", "Primary consent-event identifier."),
        default: "gen_random_uuid()",
      },
      internalId("session_id", "Session for which consent was recorded."),
      internalId("participant_id", "Participant who gave consent."),
      {
        name: "consent_version",
        type: "text",
        nullable: false,
        source: "Consent configuration",
        meaning: "Version of the consent wording accepted.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "participation_consent",
        type: "boolean",
        nullable: false,
        meaning: "Agreement to participate in the research.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
        caveats: ["Session creation rejects false values."],
      },
      {
        name: "voice_input_consent",
        type: "boolean",
        nullable: false,
        default: "false",
        meaning: "Agreement to speak answers into the asynchronous form.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
        caveats: ["This is distinct from live-call recording consent."],
      },
      {
        name: "recording_consent",
        type: "boolean",
        nullable: false,
        default: "false",
        meaning: "Agreement to record a live interview call.",
        visibility: "Visible Through Drill-Down",
        publicVisibility: "dashboard-only",
      },
      {
        name: "consented_at",
        type: "timestamptz",
        nullable: false,
        default: "now()",
        meaning: "When the consent event was recorded.",
        visibility: "Directly Visible",
        publicVisibility: "dashboard-only",
      },
    ],
    foreignKeys: ["consent-session", "consent-participant"],
    uniqueConstraints: [],
    checkConstraints: [],
    caveats: [
      "Rows are append-only; renewed consent creates another row.",
      "RLS is enabled with no anon or authenticated policies.",
    ],
  },
] as const satisfies readonly TableMetadata[];

export const databaseRelationships = [
  {
    id: "questionnaire-version-study",
    enforcement: "database-foreign-key",
    sourceTable: "questionnaire_versions",
    sourceField: "study_id",
    targetTable: "studies",
    targetField: "id",
    technicalLabel: "questionnaire_versions.study_id → studies.id",
    explanation: "This connects each questionnaire version to its study.",
  },
  {
    id: "session-participant",
    enforcement: "database-foreign-key",
    sourceTable: "sessions",
    sourceField: "participant_id",
    targetTable: "participants",
    targetField: "id",
    technicalLabel: "sessions.participant_id → participants.id",
    explanation: "This connects each interview attempt to its participant.",
  },
  {
    id: "session-questionnaire-version",
    enforcement: "database-foreign-key",
    sourceTable: "sessions",
    sourceField: "questionnaire_version_id",
    targetTable: "questionnaire_versions",
    targetField: "id",
    technicalLabel:
      "sessions.questionnaire_version_id → questionnaire_versions.id",
    explanation:
      "This connects each interview attempt to the questionnaire version it used.",
  },
  {
    id: "response-session",
    enforcement: "database-foreign-key",
    sourceTable: "responses",
    sourceField: "session_id",
    targetTable: "sessions",
    targetField: "id",
    technicalLabel: "responses.session_id → sessions.id",
    explanation: "This connects each response to the session that collected it.",
  },
  {
    id: "response-participant",
    enforcement: "database-foreign-key",
    sourceTable: "responses",
    sourceField: "participant_id",
    targetTable: "participants",
    targetField: "id",
    technicalLabel: "responses.participant_id → participants.id",
    explanation:
      "This connects each response to the participant who provided it.",
  },
  {
    id: "consent-session",
    enforcement: "database-foreign-key",
    sourceTable: "consents",
    sourceField: "session_id",
    targetTable: "sessions",
    targetField: "id",
    technicalLabel: "consents.session_id → sessions.id",
    explanation: "This connects each consent event to its interview session.",
  },
  {
    id: "consent-participant",
    enforcement: "database-foreign-key",
    sourceTable: "consents",
    sourceField: "participant_id",
    targetTable: "participants",
    targetField: "id",
    technicalLabel: "consents.participant_id → participants.id",
    explanation: "This connects each consent event to the participant who gave it.",
  },
] as const satisfies readonly DatabaseRelationshipMetadata[];

export const logicalRelationships = [
  {
    id: "session-version-copy",
    enforcement: "logical-application-expectation",
    source: "sessions.questionnaire_version",
    expectedAgreement: "questionnaire_versions.version via questionnaire_version_id",
    explanation: "The denormalized version string should match its referenced row.",
  },
  {
    id: "response-session-participant",
    enforcement: "logical-application-expectation",
    source: "responses.participant_id",
    expectedAgreement: "sessions.participant_id via responses.session_id",
    explanation:
      "A response participant should be the participant attached to its session.",
  },
  {
    id: "response-question-id",
    enforcement: "logical-application-expectation",
    source: "responses.question_id",
    expectedAgreement: "a configured question ID for the session version",
    explanation: "The database stores text and does not enforce catalogue membership.",
  },
  {
    id: "response-construct",
    enforcement: "logical-application-expectation",
    source: "responses.construct",
    expectedAgreement: "the question's configured research construct",
    explanation: "The stored construct should match questionnaire metadata.",
  },
  {
    id: "response-type",
    enforcement: "logical-application-expectation",
    source: "responses.response_type",
    expectedAgreement: "the question's configured response type",
    explanation:
      "The SQL check validates the allowed type set, not the type assigned to a particular question.",
  },
  {
    id: "profile-response-mirrors",
    enforcement: "logical-application-expectation",
    source: "participants.role, industry, experience, closeness_to_discovery",
    expectedAgreement: "formatted Q1–Q4 response values",
    explanation:
      "Participant profile columns are convenience mirrors of canonical raw response rows.",
  },
  {
    id: "consent-questionnaire-version",
    enforcement: "logical-application-expectation",
    source: "consents.consent_version",
    expectedAgreement:
      "questionnaire_versions.consent_version for the consent's session",
    explanation:
      "Consent wording should correspond to the questionnaire version used by the session.",
  },
] as const satisfies readonly LogicalRelationshipMetadata[];

function buildSchemaCatalogue(): Readonly<
  Record<ResearchTableName, TableMetadata>
> {
  const catalogue = {} as Record<ResearchTableName, TableMetadata>;

  for (const table of tableCatalogue) {
    catalogue[table.name] = table;
  }

  return Object.freeze(catalogue);
}

export const schemaCatalogue = buildSchemaCatalogue();

export function getTableMetadata(tableName: ResearchTableName): TableMetadata {
  return schemaCatalogue[tableName];
}

export function getFieldMetadata(
  tableName: ResearchTableName,
  fieldName: string,
): FieldMetadata | undefined {
  return getTableMetadata(tableName).fields.find(
    (field) => field.name === fieldName,
  );
}

export function getRelationshipsForTable(
  tableName: ResearchTableName,
): readonly DatabaseRelationshipMetadata[] {
  return databaseRelationships.filter(
    (relationship) =>
      relationship.sourceTable === tableName ||
      relationship.targetTable === tableName,
  );
}
