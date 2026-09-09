import { z } from "zod";

/* -------------------------------------------------------------- questions */

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
});

const uniqueOptions = z
  .array(optionSchema)
  .min(2)
  .refine(
    (options) =>
      new Set(options.map((option) => option.value)).size === options.length,
    { message: "Option values must be unique within a question." }
  );

const researchMetadataSchema = z.object({
  sourceRef: z.string().min(1),
  intent: z.string().min(1),
});

const textValidationSchema = z
  .object({
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
  })
  .refine(
    (rules) =>
      rules.minLength === undefined ||
      rules.maxLength === undefined ||
      rules.maxLength >= rules.minLength,
    { message: "maxLength must be greater than or equal to minLength." }
  );

const selectionValidationSchema = z
  .object({
    minSelections: z.number().int().nonnegative().optional(),
    maxSelections: z.number().int().positive().optional(),
  })
  .refine(
    (rules) =>
      rules.minSelections === undefined ||
      rules.maxSelections === undefined ||
      rules.maxSelections >= rules.minSelections,
    { message: "maxSelections must be greater than or equal to minSelections." }
  );

const baseQuestionSchema = z.object({
  id: z.string().min(1),
  construct: z.string().min(1),
  section: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  description: z.string().min(1).optional(),
  required: z.boolean(),
  researchMetadata: researchMetadataSchema,
});

export const interviewQuestionSchema = z.discriminatedUnion("responseType", [
  baseQuestionSchema.extend({
    responseType: z.literal("single_select"),
    options: uniqueOptions,
    allowOther: z.boolean().optional(),
  }),
  baseQuestionSchema.extend({
    responseType: z.literal("multi_select"),
    options: uniqueOptions,
    allowOther: z.boolean().optional(),
    validation: selectionValidationSchema.optional(),
  }),
  baseQuestionSchema
    .extend({
      responseType: z.literal("likert_scale"),
      min: z.number().int(),
      max: z.number().int(),
      minLabel: z.string().min(1).optional(),
      maxLabel: z.string().min(1).optional(),
    })
    .refine((question) => question.max > question.min, {
      message: "Scale maximum must be greater than its minimum.",
      path: ["max"],
    }),
  baseQuestionSchema.extend({
    responseType: z.literal("ranking"),
    options: uniqueOptions,
    validation: selectionValidationSchema.optional(),
  }),
  baseQuestionSchema.extend({
    responseType: z.literal("short_text"),
    placeholder: z.string().min(1).optional(),
    validation: textValidationSchema.optional(),
  }),
  baseQuestionSchema.extend({
    responseType: z.literal("long_text"),
    placeholder: z.string().min(1).optional(),
    validation: textValidationSchema.optional(),
  }),
  baseQuestionSchema.extend({
    responseType: z.literal("voice_or_text"),
    placeholder: z.string().min(1).optional(),
    allowVoice: z.boolean(),
    allowText: z.boolean(),
    validation: textValidationSchema.optional(),
  }),
  baseQuestionSchema.extend({
    responseType: z.literal("optional_elaboration"),
    required: z.literal(false),
    placeholder: z.string().min(1).optional(),
    validation: textValidationSchema.optional(),
  }),
]);

const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  layer: z.enum(["profile", "core"]),
});

const constructSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
});

export const questionnaireSchema = z
  .object({
    version: z.string().min(1),
    title: z.string().min(1),
    sections: z.array(sectionSchema).min(1),
    constructs: z.array(constructSchema).min(1),
    questions: z.array(interviewQuestionSchema).min(1),
  })
  .superRefine((questionnaire, ctx) => {
    const questionIds = new Set<string>();
    for (const question of questionnaire.questions) {
      if (questionIds.has(question.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate question id "${question.id}".`,
          path: ["questions"],
        });
      }
      questionIds.add(question.id);
    }

    const sectionIds = new Set(questionnaire.sections.map((s) => s.id));
    const constructIds = new Set(questionnaire.constructs.map((c) => c.id));

    questionnaire.questions.forEach((question, index) => {
      if (!sectionIds.has(question.section)) {
        ctx.addIssue({
          code: "custom",
          message: `Question "${question.id}" references unknown section "${question.section}".`,
          path: ["questions", index, "section"],
        });
      }
      if (!constructIds.has(question.construct)) {
        ctx.addIssue({
          code: "custom",
          message: `Question "${question.id}" references unknown construct "${question.construct}".`,
          path: ["questions", index, "construct"],
        });
      }
    });
  });
