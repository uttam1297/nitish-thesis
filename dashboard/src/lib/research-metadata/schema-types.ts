export type ResearchTableName =
  | "studies"
  | "questionnaire_versions"
  | "participants"
  | "sessions"
  | "responses"
  | "consents";

export type DatabaseFieldType =
  | "uuid"
  | "text"
  | "boolean"
  | "integer"
  | "timestamptz"
  | "jsonb";

export type FieldVisibility =
  | "Directly Visible"
  | "Visible Through Drill-Down"
  | "Used for Analytics"
  | "Technical/Internal Only";

export type PublicVisibility = "dashboard-only" | "never";

export type SecurityClassification =
  | "internal-identifier"
  | "credential-derivative"
  | "operational-sensitive";

export type FieldMetadata = Readonly<{
  name: string;
  type: DatabaseFieldType;
  nullable: boolean;
  default?: string;
  source?: string;
  meaning: string;
  visibility: FieldVisibility;
  publicVisibility: PublicVisibility;
  securityClassification?: SecurityClassification;
  caveats?: readonly string[];
}>;

export type UniqueConstraintMetadata = Readonly<{
  fields: readonly string[];
  meaning: string;
}>;

export type CheckConstraintMetadata = Readonly<{
  fields: readonly string[];
  expression: string;
  meaning: string;
}>;

export type RelationshipId =
  | "questionnaire-version-study"
  | "session-participant"
  | "session-questionnaire-version"
  | "response-session"
  | "response-participant"
  | "consent-session"
  | "consent-participant";

export type DatabaseRelationshipMetadata = Readonly<{
  id: RelationshipId;
  enforcement: "database-foreign-key";
  sourceTable: ResearchTableName;
  sourceField: string;
  targetTable: ResearchTableName;
  targetField: string;
  technicalLabel: string;
  explanation: string;
}>;

export type LogicalRelationshipMetadata = Readonly<{
  id: string;
  enforcement: "logical-application-expectation";
  source: string;
  expectedAgreement: string;
  explanation: string;
}>;

export type TableMetadata = Readonly<{
  name: ResearchTableName;
  purpose: string;
  primaryKey: "id";
  fields: readonly FieldMetadata[];
  foreignKeys: readonly RelationshipId[];
  uniqueConstraints: readonly UniqueConstraintMetadata[];
  checkConstraints: readonly CheckConstraintMetadata[];
  caveats: readonly string[];
}>;
