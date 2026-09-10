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
      "A short qualitative interview on how AI-mediated discovery is changing B2C customer acquisition — for my Master's thesis.",
    highlights: [
      "One question at a time",
      "Type or speak your answer",
      "Saved as you go — pause anytime",
    ],
    resume: {
      title: "You have an unfinished session",
      description:
        "We found saved answers from earlier on this device. Continue where you left off, or start over.",
      continueLabel: "Continue previous session",
      startOverLabel: "Start over",
    },
    moreLabel: "About this study",
    more: {
      body: [
        "There are no correct or expected answers — I am interested in your professional experience, observations and judgment. Where possible, distinguish between what you have directly observed, what your organisation is experimenting with, and what you expect may happen.",
      ],
      points: [
        "Potential competitive risks for firms that do not adapt",
        "How practitioners and organisations are currently responding",
        "Which strategic and organisational capabilities may become important",
        "How these findings translate into an actionable framework for B2C companies",
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
      "Your responses are stored under a pseudonymous participant code, not your name, in a private research record only the researcher can access.",
    codeLabel: "Your participant code",
    contactLabel: "Questions about the study? Reach out anytime:",
    contactEmail: "Nitish.Narayan@student.htw-berlin.de",
  },

  navigation: {
    continueLabel: "Continue",
    backLabel: "Back",
  },
} as const;
