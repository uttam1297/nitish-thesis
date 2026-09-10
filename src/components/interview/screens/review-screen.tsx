"use client";

import { CheckCircle2, Pencil } from "lucide-react";

import { StatusMessage } from "@/components/feedback/status-message";
import { NavigationControls } from "@/components/interview/navigation-controls";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { studyContent } from "@/config/interview/study-content";
import { summarise, type AnswerSummary } from "@/domain/interview/summary";
import { useInterview } from "@/features/interview/interview-provider";
import { cn } from "@/lib/utils";

/**
 * Answers are grouped by section and collapsed by default, so a participant
 * can submit without re-reading everything but can still open any section,
 * check an answer and jump straight back to that question.
 */
export function ReviewScreen() {
  const interview = useInterview();
  const { review } = studyContent;
  const summaries = summarise(interview.visible, interview.state.responses);
  const outstanding = interview.outstandingRequired;
  const outstandingIds = new Set(outstanding.map((question) => question.id));

  const sections = interview.questionnaire.sections
    .map((section) => ({
      section,
      items: summaries.filter((item) => item.section === section.id),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Surface className="mx-auto max-w-(--width-reading) p-5 sm:p-8">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {review.eyebrow}
          </p>
          <h1 className="text-xl font-medium tracking-[-0.015em] sm:text-2xl">
            {review.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.introduction}
          </p>
        </div>

        {outstanding.length > 0 && (
          <div className="grid gap-2">
            <StatusMessage variant="warning">
              {review.incompleteLabel}
            </StatusMessage>
            <ul className="grid gap-2">
              {outstanding.map((question) => (
                <li key={question.id}>
                  <Button
                    variant="secondary"
                    className="w-full justify-between"
                    onClick={() => interview.goToStep(question.id, true)}
                  >
                    {question.title}
                    <Pencil aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3">
          {sections.map(({ section, items }) => {
            const needsAttention = items.some((item) =>
              outstandingIds.has(item.questionId)
            );
            return (
              <details
                key={section.id}
                open={needsAttention}
                className="rounded-lg border bg-surface-subtle"
              >
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-ring/35">
                  {section.title}
                  <span className="text-xs font-medium text-muted-foreground">
                    {items.filter((item) => item.state === "answered").length}{" "}
                    of {items.length} answered
                  </span>
                </summary>
                <ul className="grid gap-2 border-t p-3">
                  {items.map((item) => (
                    <ReviewRow
                      key={item.questionId}
                      item={item}
                      onEdit={() => interview.goToStep(item.questionId, true)}
                    />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>

        {outstanding.length === 0 && (
          <div className="rounded-md border border-success/25 bg-success/5 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-success"
              />
              Everything required is answered.
            </span>
          </div>
        )}

        <NavigationControls
          onBack={interview.goBack}
          onContinue={interview.submit}
          continueLabel={review.submitLabel}
          continueDisabled={outstanding.length > 0}
        />
      </div>
    </Surface>
  );
}

function ReviewRow({
  item,
  onEdit,
}: {
  item: AnswerSummary;
  onEdit: () => void;
}) {
  const { review } = studyContent;
  const fallback =
    item.state === "skipped" ? review.skippedLabel : review.unansweredLabel;

  return (
    <li className="rounded-md border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold">{item.title}</p>
          <p
            className={cn(
              "line-clamp-3 text-sm leading-relaxed",
              item.state === "answered"
                ? "text-muted-foreground"
                : "text-muted-foreground italic"
            )}
          >
            {item.state === "answered" ? item.text : fallback}
          </p>
        </div>
        <Button variant="ghost" onClick={onEdit}>
          Edit
          <span className="sr-only"> {item.title}</span>
        </Button>
      </div>
    </li>
  );
}
