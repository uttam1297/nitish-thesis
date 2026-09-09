import type { InterviewQuestion } from "@/domain/interview/types";

/**
 * Participant-profile questions copied verbatim from Q1-Q4 in
 * `question-set.md`. Response controls are presentation metadata only.
 */
export const profileQuestions: InterviewQuestion[] = [
  {
    id: "q1",
    construct: "discovery-behaviour",
    section: "about-you",
    title: "Question 1",
    prompt: "Which area best describes your main professional responsibility?",
    description: "Allow multiple selection.",
    required: true,
    responseType: "multi_select",
    allowOther: true,
    validation: { minSelections: 1 },
    options: [
      { value: "product", label: "Product / Product Management" },
      { value: "growth", label: "Growth / Customer Acquisition" },
      { value: "performance-marketing", label: "Performance Marketing" },
      { value: "seo", label: "SEO / Organic Growth" },
      { value: "product-marketing", label: "Product Marketing" },
      { value: "e-commerce", label: "E-commerce" },
      { value: "crm", label: "CRM / Lifecycle / Retention" },
      { value: "data", label: "Data / Analytics" },
      { value: "digital-strategy", label: "Digital Strategy" },
      { value: "engineering", label: "Engineering / Technology" },
    ],
    researchMetadata: {
      sourceRef: "Q1",
      intent: "Verbatim question from question-set.md.",
    },
  },
  {
    id: "q2",
    construct: "discovery-behaviour",
    section: "about-you",
    title: "Question 2",
    prompt: "Which industry or B2C sector do you primarily work in?",
    required: false,
    responseType: "short_text",
    validation: { maxLength: 160 },
    researchMetadata: {
      sourceRef: "Q2",
      intent: "Verbatim question from question-set.md.",
    },
  },
  {
    id: "q3",
    construct: "discovery-behaviour",
    section: "about-you",
    title: "Question 3",
    prompt:
      "Approximately how many years of professional experience do you have in relevant digital/product/growth work?",
    required: false,
    responseType: "short_text",
    validation: { maxLength: 80 },
    researchMetadata: {
      sourceRef: "Q3",
      intent: "Verbatim question from question-set.md.",
    },
  },
  {
    id: "q4",
    construct: "discovery-behaviour",
    section: "about-you",
    title: "Question 4",
    prompt:
      "How closely does your current role relate to customer discovery or customer acquisition?",
    required: false,
    responseType: "likert_scale",
    min: 1,
    max: 5,
    minLabel: "Not closely",
    maxLabel: "Very closely",
    researchMetadata: {
      sourceRef: "Q4",
      intent: "Verbatim question from question-set.md.",
    },
  },
];
