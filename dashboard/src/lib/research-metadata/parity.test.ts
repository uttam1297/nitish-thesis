import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { describe, expect, it } from "vitest";

import { questionnaireV130, researchConstructs } from "./questionnaire-v1-3-0";
import { questionnaireV150 } from "./questionnaire-v1-5-0";
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
    "1ecda8fa87fdbb14f7e84e5ff1ca986d6fcb9923e025dcb6052a31c0be9e2c72",
  "src/config/interview/profile-questions.ts":
    "a6532d8c7792aa4fc5b8df3920eeeea4d16b1ad26fb8da9fef6afb180af26213",
  "src/config/interview/core-questions.ts":
    "8b0d4a6fd7a7243c4196d74e74e376f10c14a81b2c26e220b77531a1b985fa64",
  "src/config/interview/taxonomy.ts":
    "30435d6e5a1e888e681f048986047c9cf9bca94c8450ed07255192473e27115f",
  "src/domain/interview/types.ts":
    "cc3efd7fd8eb236472596a47e6192317f32163752f1d76d43efc5c0d4ec0c3bf",
  "src/domain/interview/conditions.ts":
    "89c2bb9a01f303b7d120af0102e57c14a084f78b014570cf030d2bc5e0d63cd8",
  "src/features/interview/use-server-sync.ts":
    "db4f3f620b2e162fc33724553848b62e46104b511a71007118ddd1d75f6fe519",
  "supabase/migrations/20260910100000_init.sql":
    "b384429e7ce0a3585a0a187b3fb92c6f5ef9c762a600d9c8da68fd03f4444b6e",
  "supabase/migrations/20260911231500_questionnaire_v1_3_0.sql":
    "f199a4a210eaf5ec1e0eb4eb0cee1f5c2936d2ddcd93d9e12615c6c47f8265a3",
  "supabase/migrations/20260916120000_questionnaire_v1_4_0.sql":
    "549002ded704b43667e43595f5c6a4280728b869a10f7435adb1c0519304e8a4",
  "supabase/migrations/20260916140000_questionnaire_v1_5_0.sql":
    "4ed2a451cf0b5abe4476b5d2991345d23d221b09ce70d9de772ad17d495af1e9",
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

    expect(versionMatch?.[1]).toBe(questionnaireV150.version);
  });
});
