import type { InterviewQuestion } from "@/domain/interview/types";

interface SourceQuestion {
  id: `q${number}`;
  sourceRef: `Q${number}`;
  section:
    | "observed-change"
    | "risk-exposure"
    | "organisational-response"
    | "measurement-outlook";
  construct:
    | "discovery-behaviour"
    | "journey-evidence"
    | "ai-use-and-channels"
    | "competitive-risk"
    | "exposure-and-consequences"
    | "organisational-response"
    | "prioritisation"
    | "capability-requirements"
    | "governance"
    | "measurement";
  prompt: string;
  hint?: string;
}

/** Every core prompt is copied verbatim from Q5-Q18 in `question-set.md`. */
const sourceQuestions: SourceQuestion[] = [
  {
    id: "q5",
    sourceRef: "Q5",
    section: "observed-change",
    construct: "discovery-behaviour",
    prompt:
      "Based on your professional experience, have you observed any changes in how consumers discover, research, compare or evaluate products or services because of AI-based tools or AI-mediated interfaces? Please describe what you have observed.",
    hint: "Think about tools like ChatGPT, AI search, or recommendation engines — any shift you've noticed in how people find products.",
  },
  {
    id: "q6",
    sourceRef: "Q6",
    section: "observed-change",
    construct: "journey-evidence",
    prompt:
      "Where, if anywhere, do you think AI-mediated discovery changes the traditional customer journey most significantly? Please explain what changes at that stage and why",
    hint: "Consider stages like awareness, consideration, comparison, or purchase — where does AI have the biggest impact?",
  },
  {
    id: "q7",
    sourceRef: "Q7",
    section: "observed-change",
    construct: "ai-use-and-channels",
    prompt:
      "How, if at all, does AI-mediated discovery change the role or effectiveness of existing customer-acquisition channels such as search engines, paid advertising, social media, marketplaces or direct website/app discovery?",
    hint: "For example, is Google search less effective now? Are social ads performing differently? Share what you've seen.",
  },
  {
    id: "q8",
    sourceRef: "Q8",
    section: "risk-exposure",
    construct: "competitive-risk",
    prompt:
      "What competitive disadvantages or strategic risks, if any, could arise for a B2C company that does not adapt its customer-acquisition approach to AI-mediated discovery?",
    hint: "Think about what a company might lose — market share, visibility, customer trust — if it ignores this shift.",
  },
  {
    id: "q9",
    sourceRef: "Q9",
    section: "risk-exposure",
    construct: "exposure-and-consequences",
    prompt:
      "Do you think some types of B2C companies are more exposed to these risks than others? If so, what characteristics make a company more or less vulnerable?",
    hint: "Consider factors like company size, industry, product type, or how digitally mature the business is.",
  },
  {
    id: "q10",
    sourceRef: "Q10",
    section: "organisational-response",
    construct: "organisational-response",
    prompt:
      "What actions, experiments or strategic responses have you seen organizations take in response to AI-mediated customer discovery?",
    hint: "This could be anything — new tools, team restructuring, content strategy shifts, partnerships, or pilot programs.",
  },
  {
    id: "q11",
    sourceRef: "Q11",
    section: "organisational-response",
    construct: "organisational-response",
    prompt:
      "What actions, experiments or strategic responses have you seen organizations take in response to AI-mediated customer discovery?",
    hint: "Share specific examples — even small experiments or early-stage initiatives count.",
  },
  {
    id: "q12",
    sourceRef: "Q12",
    section: "organisational-response",
    construct: "prioritisation",
    prompt:
      "What are the main difficulties organizations face when trying to decide how much time, investment or management attention to devote to AI-mediated discovery?",
    hint: "Think about budget constraints, competing priorities, lack of data, or organizational inertia.",
  },
  {
    id: "q13",
    sourceRef: "Q13",
    section: "organisational-response",
    construct: "capability-requirements",
    prompt:
      "What capabilities does a B2C company need in order to respond effectively to AI-mediated customer discovery?",
    hint: "This could be skills, technology, processes, or mindset — anything that helps a company adapt.",
  },
  {
    id: "q14",
    sourceRef: "Q14",
    section: "organisational-response",
    construct: "governance",
    prompt:
      "Who should be responsible for AI-mediated discovery inside a B2C organization, and how should relevant teams work together?",
    hint: "Think about roles, departments, or cross-functional setups that would work best.",
  },
  {
    id: "q15",
    sourceRef: "Q15",
    section: "measurement-outlook",
    construct: "measurement",
    prompt:
      "How should a company determine whether its efforts around AI-mediated discovery are actually working? What should it measure or monitor?",
    hint: "Consider KPIs, metrics, or signals — both quantitative and qualitative.",
  },
  {
    id: "q16",
    sourceRef: "Q16",
    section: "measurement-outlook",
    construct: "capability-requirements",
    prompt:
      "Imagine a B2C company understands that AI may change customer discovery but has done very little about it so far. What should management do first, and what should happen after that?",
    hint: "Outline a practical starting point and sequence of steps — what's the first move?",
  },
  {
    id: "q17",
    sourceRef: "Q17",
    section: "measurement-outlook",
    construct: "capability-requirements",
    prompt:
      "Do you think increasing AI mediation changes the importance of brand strength, direct customer relationships or customer retention for B2C firms? Why or why not?",
    hint: "Does brand matter more or less when AI curates choices? What about loyalty and retention?",
  },
  {
    id: "q18",
    sourceRef: "Q18",
    section: "measurement-outlook",
    construct: "capability-requirements",
    prompt:
      "What do you think B2C companies are currently most likely to underestimate about AI-mediated customer discovery over the next two to three years?",
    hint: "Think about blind spots — what's being overlooked or underestimated right now?",
  },
];

export const coreQuestions: InterviewQuestion[] = sourceQuestions.map(
  ({ id, sourceRef, section, construct, prompt, hint }) => ({
    id,
    section,
    construct,
    title: `Question ${sourceRef.slice(1)}`,
    prompt,
    description: hint,
    required: true,
    responseType: "voice_or_text",
    allowVoice: true,
    allowText: true,
    validation: { minLength: 20 },
    researchMetadata: {
      sourceRef,
      intent: "Verbatim question from question-set.md.",
    },
    // Q7 asks about the effectiveness of hands-on acquisition channels. A
    // participant whose Q1 answer is "Engineering / Technology" only has no
    // direct channel exposure to report on, so the question adapts the path
    // by stepping aside rather than forcing an answer the construct doesn't
    // need from them; every other participant still sees it.
    ...(id === "q7"
      ? {
          visibleWhen: [
            {
              questionId: "q1",
              operator: "notEquals" as const,
              value: "engineering",
            },
          ],
        }
      : {}),
  })
);
