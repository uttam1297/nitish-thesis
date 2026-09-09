import type {
  InterviewSection,
  ResearchConstruct,
} from "@/domain/interview/types";

/**
 * The ten research constructs of the thesis instrument.
 * `order` matches the construct list in the research design.
 */
export const constructs: ResearchConstruct[] = [
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
];

export const sections: InterviewSection[] = [
  {
    id: "about-you",
    title: "About you",
    summary:
      "A few quick questions so your answers can be read in the right professional context.",
    layer: "profile",
  },
  {
    id: "observed-change",
    title: "What you have observed",
    summary:
      "Your direct observations of how customers now discover and evaluate products.",
    layer: "core",
  },
  {
    id: "risk-exposure",
    title: "Risk and exposure",
    summary:
      "Where you think the strategic risks sit, and which companies carry more of them.",
    layer: "core",
  },
  {
    id: "organisational-response",
    title: "Organisational response",
    summary:
      "What organisations are actually doing, who owns it, and how they decide what it is worth.",
    layer: "core",
  },
  {
    id: "measurement-outlook",
    title: "Measurement and outlook",
    summary:
      "How success should be judged, what capabilities are needed, and what comes next.",
    layer: "core",
  },
];
