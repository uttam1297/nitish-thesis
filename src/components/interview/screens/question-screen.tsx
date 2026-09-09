"use client";

import { useId, useState } from "react";

import { NavigationControls } from "@/components/interview/navigation-controls";
import { QuestionContainer } from "@/components/interview/question-container";
import { ResponseField } from "@/components/interview/response/response-field";
import { StatusMessage } from "@/components/feedback/status-message";
import { studyContent } from "@/config/interview/study-content";
import { useInterview } from "@/features/interview/interview-provider";
import type { InterviewQuestion } from "@/domain/interview/types";

interface QuestionScreenProps {
  question: InterviewQuestion;
}

/**
 * One screen for every question, regardless of response type.
 *
 * The screen owns navigation, validation and announcements; the response
 * control itself comes from the registry, so adding a response type never
 * means touching this file.
 */
export function QuestionScreen({ question }: QuestionScreenProps) {
  const interview = useInterview();
  const headingId = useId();
  const descriptionId = useId();
  const errorId = useId();
  // The engine keys each step, so this screen remounts per question and the
  // error state starts clear without an effect.
  const [error, setError] = useState<string | null>(null);

  const value = interview.answerOf(question);
  const progress = interview.progress;

  function handleContinue() {
    const message = interview.validate(question);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    interview.goNext();
  }

  return (
    <QuestionContainer
      headingId={headingId}
      section={progress.sectionTitle ?? question.section}
      prompt={question.prompt}
      supportingText={question.description}
      supportingTextId={descriptionId}
    >
      <ResponseField
        question={question}
        value={value}
        labelledBy={headingId}
        describedBy={question.description ? descriptionId : undefined}
        invalid={Boolean(error)}
        onChange={(nextValue, method) => {
          setError(null);
          interview.answer(question, nextValue, method);
        }}
      />

      {error && (
        <div id={errorId}>
          <StatusMessage variant="warning">{error}</StatusMessage>
        </div>
      )}

      <NavigationControls
        onBack={interview.goBack}
        onContinue={handleContinue}
        continueLabel={
          interview.state.returningToReview
            ? "Save and return to review"
            : studyContent.navigation.continueLabel
        }
        onSkip={question.required ? undefined : () => interview.skip(question)}
        skipLabel={studyContent.navigation.skipLabel}
      />
    </QuestionContainer>
  );
}
