import type {
  CurrentQuestionId,
  NarrativeQuestionMetadata,
  QuestionnaireMetadata,
  ResearchConstructId,
  ResearchConstructMetadata,
} from "./types";

const QUESTIONNAIRE_VERSION = "1.3.0" as const;
const QUESTION_VERSION = "1" as const;

const otherOption = {
  enabled: true,
  value: "__other__",
  requiresText: true,
} as const;

export const researchConstructs = [
  {
    id: "discovery-behaviour",
    order: 1,
    title: "Consumer discovery and decision process",
    description:
      "How consumers discover, research, compare and evaluate products, and what has changed.",
  },
  {
    id: "journey-evidence",
    order: 2,
    title: "Journey stages, evidence and tooling",
    description:
      "Where in the customer journey AI mediation bites hardest, and the evidence practitioners rely on.",
  },
  {
    id: "ai-use-and-channels",
    order: 3,
    title: "Current AI use and channel effectiveness",
    description:
      "How AI-mediated discovery changes acquisition channels, and how practitioners use AI themselves.",
  },
  {
    id: "competitive-risk",
    order: 4,
    title: "Competitive risk of not adapting",
    description:
      "Strategic risks and disadvantages for firms that do not adapt customer acquisition.",
  },
  {
    id: "exposure-and-consequences",
    order: 5,
    title: "Differential exposure and consequences",
    description:
      "Which firms are more exposed, what makes them vulnerable, and the consequences observed.",
  },
  {
    id: "organisational-response",
    order: 6,
    title: "Organisational response and experimentation",
    description:
      "Actions, experiments and strategic responses observed in industry and inside the participant's organisation.",
  },
  {
    id: "prioritisation",
    order: 7,
    title: "Prioritisation and trade-offs",
    description:
      "How organisations decide how much time, investment and attention to devote to AI-mediated discovery.",
  },
  {
    id: "governance",
    order: 8,
    title: "Governance, responsibility and risk",
    description:
      "Who owns AI-mediated discovery internally, how teams collaborate, and the risks that need managing.",
  },
  {
    id: "measurement",
    order: 9,
    title: "Outcome measurement and learning",
    description:
      "How firms should judge whether their response to AI-mediated discovery is working.",
  },
  {
    id: "capability-requirements",
    order: 10,
    title: "Capability requirements and roadmap",
    description:
      "Capabilities, sequencing and blind spots that inform the framework and implementation roadmap.",
  },
] as const satisfies readonly ResearchConstructMetadata[];

const profileQuestions = [
  {
    id: "q1",
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    questionVersion: QUESTION_VERSION,
    sourceRef: "Q1",
    section: "about-you",
    construct: "discovery-behaviour",
    wording: "Which area best describes your main professional responsibility?",
    hint: "Allow multiple selection.",
    required: true,
    responseType: "multi_select",
    responseShape: {
      kind: "choices",
      values: "string[]",
      otherText: "string | undefined",
    },
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
    otherOption,
    validation: { minimumSelections: 1 },
  },
  {
    id: "q2",
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    questionVersion: QUESTION_VERSION,
    sourceRef: "Q2",
    section: "about-you",
    construct: "discovery-behaviour",
    wording: "Which industry or B2C sector do you primarily work in?",
    required: true,
    responseType: "single_select",
    responseShape: {
      kind: "choice",
      value: "string",
      otherText: "string | undefined",
    },
    options: [
      { value: "retail-ecommerce", label: "Retail / E-commerce" },
      { value: "travel-hospitality", label: "Travel & Hospitality" },
      {
        value: "financial-services",
        label: "Financial Services / Fintech",
      },
      { value: "telecom", label: "Telecommunications" },
      { value: "media-entertainment", label: "Media & Entertainment" },
      {
        value: "consumer-tech",
        label: "Consumer Technology / Electronics",
      },
      { value: "food-beverage", label: "Food & Beverage" },
      { value: "health-wellness", label: "Health & Wellness" },
      { value: "fashion-apparel", label: "Fashion & Apparel" },
      { value: "automotive", label: "Automotive" },
      { value: "education", label: "Education" },
    ],
    otherOption,
  },
  {
    id: "q3",
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    questionVersion: QUESTION_VERSION,
    sourceRef: "Q3",
    section: "about-you",
    construct: "discovery-behaviour",
    wording:
      "Approximately how many years of professional experience do you have in relevant digital/product/growth work?",
    required: true,
    responseType: "single_select",
    responseShape: {
      kind: "choice",
      value: "string",
      otherText: "string | undefined",
    },
    options: [
      { value: "under-1", label: "Under 1 year" },
      { value: "1-3", label: "1-3 years" },
      { value: "3-6", label: "3-6 years" },
      { value: "6-10", label: "6-10 years" },
      { value: "10-plus", label: "10+ years" },
    ],
  },
  {
    id: "q4",
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    questionVersion: QUESTION_VERSION,
    sourceRef: "Q4",
    section: "about-you",
    construct: "discovery-behaviour",
    wording:
      "How closely does your current role relate to customer discovery or customer acquisition?",
    required: true,
    responseType: "likert_scale",
    responseShape: { kind: "scale", value: "number" },
    scale: {
      minimum: 1,
      maximum: 5,
      minimumLabel: "Not closely",
      maximumLabel: "Very closely",
    },
  },
] as const;

type NarrativeSource = Readonly<{
  id: Exclude<CurrentQuestionId, "q1" | "q2" | "q3" | "q4">;
  sourceRef: `Q${number}`;
  section:
    | "observed-change"
    | "risk-exposure"
    | "organisational-response"
    | "measurement-outlook";
  construct: ResearchConstructId;
  wording: string;
  hint: string;
}>;

const narrativeSources = [
  {
    id: "q5",
    sourceRef: "Q5",
    section: "observed-change",
    construct: "discovery-behaviour",
    wording:
      "Based on your professional experience, have you observed any changes in how consumers discover, research, compare or evaluate products or services because of AI-based tools or AI-mediated interfaces? Please describe what you have observed.",
    hint: "Think about tools like ChatGPT, AI search, or recommendation engines — any shift you've noticed in how people find products.",
  },
  {
    id: "q6",
    sourceRef: "Q6",
    section: "observed-change",
    construct: "journey-evidence",
    wording:
      "Where, if anywhere, do you think AI-mediated discovery changes the traditional customer journey most significantly? Please explain what changes at that stage and why",
    hint: "Consider stages like awareness, consideration, comparison, or purchase — where does AI have the biggest impact?",
  },
  {
    id: "q7",
    sourceRef: "Q7",
    section: "observed-change",
    construct: "ai-use-and-channels",
    wording:
      "How, if at all, does AI-mediated discovery change the role or effectiveness of existing customer-acquisition channels such as search engines, paid advertising, social media, marketplaces or direct website/app discovery?",
    hint: "For example, is Google search less effective now? Are social ads performing differently? Share what you've seen.",
  },
  {
    id: "q8",
    sourceRef: "Q8",
    section: "risk-exposure",
    construct: "competitive-risk",
    wording:
      "What competitive disadvantages or strategic risks, if any, could arise for a B2C company that does not adapt its customer-acquisition approach to AI-mediated discovery?",
    hint: "Think about what a company might lose — market share, visibility, customer trust — if it ignores this shift.",
  },
  {
    id: "q10",
    sourceRef: "Q10",
    section: "organisational-response",
    construct: "organisational-response",
    wording:
      "What actions, experiments or strategic responses have you seen organizations take in response to AI-mediated customer discovery?",
    hint: "This could be anything — new tools, team restructuring, content strategy shifts, partnerships, or pilot programs.",
  },
  {
    id: "q11",
    sourceRef: "Q11",
    section: "organisational-response",
    construct: "organisational-response",
    wording:
      "What actions, experiments or strategic responses have you seen organizations take in response to AI-mediated customer discovery?",
    hint: "Share specific examples — even small experiments or early-stage initiatives count.",
  },
  {
    id: "q12",
    sourceRef: "Q12",
    section: "organisational-response",
    construct: "prioritisation",
    wording:
      "What are the main difficulties organizations face when trying to decide how much time, investment or management attention to devote to AI-mediated discovery?",
    hint: "Think about budget constraints, competing priorities, lack of data, or organizational inertia.",
  },
  {
    id: "q13",
    sourceRef: "Q13",
    section: "organisational-response",
    construct: "capability-requirements",
    wording:
      "What capabilities does a B2C company need in order to respond effectively to AI-mediated customer discovery?",
    hint: "This could be skills, technology, processes, or mindset — anything that helps a company adapt.",
  },
  {
    id: "q14",
    sourceRef: "Q14",
    section: "organisational-response",
    construct: "governance",
    wording:
      "Who should be responsible for AI-mediated discovery inside a B2C organization, and how should relevant teams work together?",
    hint: "Think about roles, departments, or cross-functional setups that would work best.",
  },
  {
    id: "q15",
    sourceRef: "Q15",
    section: "measurement-outlook",
    construct: "measurement",
    wording:
      "How should a company determine whether its efforts around AI-mediated discovery are actually working? What should it measure or monitor?",
    hint: "Consider KPIs, metrics, or signals — both quantitative and qualitative.",
  },
  {
    id: "q16",
    sourceRef: "Q16",
    section: "measurement-outlook",
    construct: "capability-requirements",
    wording:
      "Imagine a B2C company understands that AI may change customer discovery but has done very little about it so far. What should management do first, and what should happen after that?",
    hint: "Outline a practical starting point and sequence of steps — what's the first move?",
  },
  {
    id: "q17",
    sourceRef: "Q17",
    section: "measurement-outlook",
    construct: "capability-requirements",
    wording:
      "Do you think increasing AI mediation changes the importance of brand strength, direct customer relationships or customer retention for B2C firms? Why or why not?",
    hint: "Does brand matter more or less when AI curates choices? What about loyalty and retention?",
  },
] as const satisfies readonly NarrativeSource[];

const narrativeQuestions: readonly NarrativeQuestionMetadata[] =
  narrativeSources.map((source) => ({
    ...source,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    questionVersion: QUESTION_VERSION,
    required: true,
    responseType: "voice_or_text",
    responseShape: { kind: "text", text: "string" },
    input: { voice: true, text: true },
    validation: { minimumNonWhitespaceCharacters: 20 },
    ...(source.id === "q7"
      ? {
          visibility: {
            questionId: "q1" as const,
            operator: "notEquals" as const,
            value: "engineering" as const,
            semantics: "not-exactly-one-selected-value" as const,
          },
        }
      : {}),
  }));

export const questionnaireV130 = {
  version: QUESTIONNAIRE_VERSION,
  title:
    "Developing a Framework and Roadmap for Adapting B2C Customer Acquisition to AI-Mediated Discovery",
  questionIds: [
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q10",
    "q11",
    "q12",
    "q13",
    "q14",
    "q15",
    "q16",
    "q17",
  ],
  questions: [...profileQuestions, ...narrativeQuestions],
  constructs: researchConstructs,
} as const satisfies QuestionnaireMetadata;
