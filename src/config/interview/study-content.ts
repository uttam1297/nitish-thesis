import { studyTitle } from "@/config/study";

/**
 * Participant-facing copy. Wording follows the study introduction and consent
 * items in the thesis question set.
 */
export const studyContent = {
  welcome: {
    eyebrow: "Master's thesis research · HTW Berlin",
    title: studyTitle,
    introduction:
      "This research investigates how AI-mediated discovery — AI search, conversational assistants and AI-enabled recommendation interfaces — may affect how consumers discover, compare and evaluate B2C products and services.",
    body: [
      "This questionnaire is designed as an asynchronous qualitative interview. There are no correct or expected answers. I am interested in your professional experience, observations and judgment.",
      "Where possible, please distinguish between what you have directly observed, what your organisation or industry is currently experimenting with, and what you expect may happen in the future.",
    ],
    highlights: [
      "One question at a time",
      "Type your answer, or speak it if your browser supports voice input",
      "Your progress is saved on this device only, so you can pause and resume",
    ],
    resume: {
      title: "You have an unfinished session",
      description:
        "We found saved answers from earlier on this device. Continue where you left off, or start over.",
      continueLabel: "Continue previous session",
      startOverLabel: "Start over",
    },
    aims: {
      title: "The study aims to understand",
      points: [
        "potential competitive risks for firms that do not adapt;",
        "how practitioners and organisations are currently responding;",
        "which strategic and organisational capabilities may become important;",
        "and how these findings translate into an actionable framework and implementation roadmap for B2C companies.",
      ],
    },
    startLabel: "Begin the interview",
  },

  consent: {
    eyebrow: "Consent",
    title: "Before we begin",
    introduction:
      "Responses will be used solely for academic research purposes and will be handled according to the confidentiality and anonymisation arrangements below.",
    statements: [
      "I voluntarily agree to participate.",
      "I understand the purpose of the research.",
      "I understand that participation is voluntary and I may stop before submission.",
      "I understand that my responses may be analysed and quoted in anonymised form in the thesis.",
      "I confirm that I will not intentionally disclose confidential employer information.",
    ],
    caution:
      "Please do not disclose confidential, proprietary or commercially sensitive information about your employer.",
    agreement: "I have read and agree to all five statements above.",
    required: "Consent is required before the interview can begin.",
  },

  review: {
    eyebrow: "Final check",
    title: "Review your answers",
    introduction:
      "You do not need to read everything again. Change anything you would like to revisit, then submit.",
    submitLabel: "Finish prototype",
    incompleteLabel:
      "Some required answers are still missing. Select one to complete it.",
    skippedLabel: "Skipped",
    unansweredLabel: "Not answered",
  },

  completion: {
    title: "Thank you for taking part.",
    description: "You have reached the end of the interview.",
    localNotice:
      "Your responses were kept only on this device for this prototype; there is no server behind it yet.",
  },

  navigation: {
    continueLabel: "Continue",
    backLabel: "Back",
    skipLabel: "Skip this question",
  },
} as const;
