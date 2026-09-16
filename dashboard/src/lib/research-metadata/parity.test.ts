import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { describe, expect, it } from "vitest";

import { questionnaireV130, researchConstructs } from "./questionnaire-v1-3-0";
import type { QuestionMetadata } from "./types";

type AuthoritativeQuestion = {
  id: string;
  construct: string;
  section: string;
  prompt: string;
  description?: string;
  required: boolean;
  responseType: string;
  options?: Array<{ value: string; label: string }>;
  allowOther?: boolean;
  allowVoice?: boolean;
  allowText?: boolean;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  validation?: { minSelections?: number; minLength?: number };
  researchMetadata: { sourceRef: string };
  visibleWhen?: Array<{
    questionId: string;
    operator: string;
    value?: string | number;
  }>;
};

type AuthoritativeConstruct = {
  id: string;
  order: number;
  title: string;
  description: string;
};

const repositoryRoot = resolve(process.cwd(), "..");

function loadStaticTypeScriptExport<T>(
  relativePath: string,
  exportName: string
): T {
  const source = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
  const outputText = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleRecord: { exports: Record<string, unknown> } = { exports: {} };

  runInNewContext(outputText, {
    exports: moduleRecord.exports,
    module: moduleRecord,
  });

  return moduleRecord.exports[exportName] as T;
}

/**
 * Development-time drift guard only. Dashboard production modules never
 * import the interview application. A changed fingerprint requires a human
 * to compare the authoritative source and update this catalogue deliberately.
 */
const authoritativeSourceFingerprints = {
  "src/config/interview/index.ts":
    "a138462b4b88c773870344f29530f596021fbc2f5d02fc5a77ca23cf33152419",
  "src/config/interview/profile-questions.ts":
    "a6532d8c7792aa4fc5b8df3920eeeea4d16b1ad26fb8da9fef6afb180af26213",
  "src/config/interview/core-questions.ts":
    "4b55742bd136f7b5e0d866085a267b337292ac6f2a0ea136150525af79cd7400",
  "src/config/interview/taxonomy.ts":
    "30435d6e5a1e888e681f048986047c9cf9bca94c8450ed07255192473e27115f",
  "src/domain/interview/types.ts":
    "0194391d22ba52f5742a85d5ad722cb68770f96e196353cde942d61bc75f9161",
  "src/domain/interview/conditions.ts":
    "164f493fda4f6ee9b5b865a1cc7b75130c31bad7f2cc385a1fb33e4e65ebee30",
  "src/features/interview/use-server-sync.ts":
    "641eeeded11f53895aceb9bf607a37c3b23d20a01528a06dfcb9c4b9c7ec443c",
  "supabase/migrations/20260910100000_init.sql":
    "b384429e7ce0a3585a0a187b3fb92c6f5ef9c762a600d9c8da68fd03f4444b6e",
  "supabase/migrations/20260911231500_questionnaire_v1_3_0.sql":
    "f199a4a210eaf5ec1e0eb4eb0cee1f5c2936d2ddcd93d9e12615c6c47f8265a3",
} as const;

describe("authoritative interview-source parity", () => {
  it.each(Object.entries(authoritativeSourceFingerprints))(
    "%s has been reviewed against the dashboard catalogue",
    (relativePath, expectedFingerprint) => {
      const source = readFileSync(resolve(repositoryRoot, relativePath));
      const actualFingerprint = createHash("sha256")
        .update(source)
        .digest("hex");

      expect(actualFingerprint).toBe(expectedFingerprint);
    }
  );

  it("matches every authoritative question field copied into the dashboard", () => {
    const authoritativeQuestions = [
      ...loadStaticTypeScriptExport<AuthoritativeQuestion[]>(
        "src/config/interview/profile-questions.ts",
        "profileQuestions"
      ),
      ...loadStaticTypeScriptExport<AuthoritativeQuestion[]>(
        "src/config/interview/core-questions.ts",
        "coreQuestions"
      ),
    ];

    expect(authoritativeQuestions).toHaveLength(
      questionnaireV130.questions.length
    );

    for (const authoritative of authoritativeQuestions) {
      const dashboard: QuestionMetadata | undefined =
        questionnaireV130.questions.find(
          (question) => question.id === authoritative.id
        );

      expect(dashboard, authoritative.id).toBeDefined();
      if (!dashboard) continue;

      expect(dashboard).toMatchObject({
        id: authoritative.id,
        sourceRef: authoritative.researchMetadata.sourceRef,
        construct: authoritative.construct,
        section: authoritative.section,
        wording: authoritative.prompt,
        required: authoritative.required,
        responseType: authoritative.responseType,
      });
      expect(dashboard.hint).toBe(authoritative.description);

      if (
        dashboard.responseType === "multi_select" &&
        authoritative.responseType === "multi_select"
      ) {
        expect(dashboard.options).toEqual(authoritative.options);
        expect(dashboard.otherOption.enabled).toBe(authoritative.allowOther);
        expect(dashboard.validation.minimumSelections).toBe(
          authoritative.validation?.minSelections
        );
      }

      if (
        dashboard.responseType === "single_select" &&
        authoritative.responseType === "single_select"
      ) {
        expect(dashboard.options).toEqual(authoritative.options);
        expect(Boolean(dashboard.otherOption)).toBe(
          Boolean(authoritative.allowOther)
        );
      }

      if (
        dashboard.responseType === "likert_scale" &&
        authoritative.responseType === "likert_scale"
      ) {
        expect(dashboard.scale).toEqual({
          minimum: authoritative.min,
          maximum: authoritative.max,
          minimumLabel: authoritative.minLabel,
          maximumLabel: authoritative.maxLabel,
        });
      }

      if (
        dashboard.responseType === "voice_or_text" &&
        authoritative.responseType === "voice_or_text"
      ) {
        expect(dashboard.input).toEqual({
          voice: authoritative.allowVoice,
          text: authoritative.allowText,
        });
        expect(dashboard.validation.minimumNonWhitespaceCharacters).toBe(
          authoritative.validation?.minLength
        );
        expect(
          dashboard.visibility
            ? [
                {
                  questionId: dashboard.visibility.questionId,
                  operator: dashboard.visibility.operator,
                  value: dashboard.visibility.value,
                },
              ]
            : undefined
        ).toEqual(authoritative.visibleWhen);
      }
    }
  });

  it("matches the authoritative construct catalogue exactly", () => {
    const authoritativeConstructs = loadStaticTypeScriptExport<
      AuthoritativeConstruct[]
    >("src/config/interview/taxonomy.ts", "constructs");

    expect(researchConstructs).toEqual(authoritativeConstructs);
  });

  it("matches the active questionnaire version constant", () => {
    const source = readFileSync(
      resolve(repositoryRoot, "src/config/interview/index.ts"),
      "utf8"
    );
    const versionMatch = source.match(/QUESTIONNAIRE_VERSION\s*=\s*"([^"]+)"/);

    expect(versionMatch?.[1]).toBe(questionnaireV130.version);
  });
});
