"use client";

import { AnimatePresence } from "motion/react";

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

function StepView({ step }: { step: Step }) {
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
      return <CompletionScreen />;
  }
}

/** Exported so tests can mount the flow with their own provider. */
export function InterviewFlow() {
  const interview = useInterview();
  const { currentStep, progress } = interview;
  const { status: syncStatus, resumeLink } = useServerSync(interview);

  const showProgress =
    currentStep.kind === "question" || currentStep.kind === "section";

  return (
    <InterviewShell
      progress={
        showProgress ? (
          <ProgressIndicator
            percent={progress.percent}
            section={progress.sectionTitle ?? "Interview"}
          />
        ) : undefined
      }
      syncStatus={showProgress ? syncStatus : undefined}
      resumeLink={showProgress ? resumeLink : undefined}
      otherTabWarning={interview.otherTabHasNewerProgress}
    >
      <AnimatePresence mode="wait" initial={false}>
        <MotionPanel key={currentStep.id} screenKey={currentStep.id}>
          <StepView step={currentStep} />
        </MotionPanel>
      </AnimatePresence>
    </InterviewShell>
  );
}

export function InterviewEngine() {
  return (
    <InterviewProvider>
      <InterviewFlow />
    </InterviewProvider>
  );
}
