"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

import { CompletionBackdrop } from "@/components/illustration/completion-backdrop";
import { ProgressIndicator } from "@/components/interview/progress-indicator";
import { CompletionScreen } from "@/components/interview/screens/completion-screen";
import { ConsentScreen } from "@/components/interview/screens/consent-screen";
import { QuestionScreen } from "@/components/interview/screens/question-screen";
import { ReviewScreen } from "@/components/interview/screens/review-screen";
import { SectionTransitionScreen } from "@/components/interview/screens/section-transition-screen";
import { WelcomeScreen } from "@/components/interview/screens/welcome-screen";
import { InterviewShell } from "@/components/layout/interview-shell";
import { MotionPanel } from "@/components/layout/motion-panel";
import {
  InterviewProvider,
  useInterview,
} from "@/features/interview/interview-provider";
import { useServerSync } from "@/features/interview/use-server-sync";
import type { Step } from "@/domain/interview/types";
import { getQuestionnaire, QUESTIONNAIRE_VERSION } from "@/config/interview";
import { draftStorage } from "@/lib/persistence/draft-storage";

function StepView({
  step,
  participantCode,
}: {
  step: Step;
  participantCode: string | null;
}) {
  switch (step.kind) {
    case "welcome":
      return <WelcomeScreen />;
    case "consent":
      return <ConsentScreen />;
    case "section":
      return <SectionTransitionScreen section={step.section} />;
    case "question":
      return <QuestionScreen question={step.question} />;
    case "review":
      return <ReviewScreen />;
    case "complete":
      return <CompletionScreen participantCode={participantCode} />;
  }
}

/** Exported so tests can mount the flow with their own provider. */
export function InterviewFlow() {
  const interview = useInterview();
  const { currentStep, progress } = interview;
  const {
    status: syncStatus,
    resumeLink,
    participantCode,
  } = useServerSync(interview);

  const showProgress =
    currentStep.kind === "question" || currentStep.kind === "section";
  const showJourneyBackdrop =
    showProgress ||
    currentStep.kind === "review" ||
    currentStep.kind === "complete";

  const questionSteps = interview.timeline.filter((s) => s.kind === "question");
  const questionIndex =
    currentStep.kind === "question"
      ? questionSteps.findIndex((s) => s.id === currentStep.id) + 1
      : undefined;

  return (
    <InterviewShell
      showUniversityLogo={currentStep.kind === "welcome"}
      progress={
        showProgress ? (
          <ProgressIndicator
            percent={progress.percent}
            section={progress.sectionTitle ?? "Interview"}
            questionIndex={questionIndex}
            totalQuestions={questionSteps.length}
          />
        ) : undefined
      }
      syncStatus={showProgress ? syncStatus : undefined}
      resumeLink={showProgress ? resumeLink : undefined}
      otherTabWarning={interview.otherTabHasNewerProgress}
      background={
        showJourneyBackdrop ? (
          <CompletionBackdrop
            progress={progress.percent}
            isComplete={currentStep.kind === "complete"}
          />
        ) : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <MotionPanel key={currentStep.id} screenKey={currentStep.id}>
          <StepView step={currentStep} participantCode={participantCode} />
        </MotionPanel>
      </AnimatePresence>
    </InterviewShell>
  );
}

export function InterviewEngine() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const draftVersion = draftStorage.load()?.questionnaireVersion;
    // localStorage is unavailable during SSR, so the version must be selected
    // after hydration to keep the first server/client render identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVersion(
      draftVersion && getQuestionnaire(draftVersion)
        ? draftVersion
        : QUESTIONNAIRE_VERSION
    );
  }, []);

  if (!version) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading interview…</p>
      </main>
    );
  }

  const selectedQuestionnaire =
    getQuestionnaire(version) ?? getQuestionnaire(QUESTIONNAIRE_VERSION)!;

  return (
    <InterviewProvider
      key={selectedQuestionnaire.version}
      questionnaire={selectedQuestionnaire}
      onStartOver={() => setVersion(QUESTIONNAIRE_VERSION)}
    >
      <InterviewFlow />
    </InterviewProvider>
  );
}
