interface ProgressIndicatorProps {
  percent: number;
  section: string;
  questionIndex?: number;
  totalQuestions?: number;
}

export function ProgressIndicator({
  section,
  questionIndex,
  totalQuestions,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="font-medium text-primary">{section}</span>
      {questionIndex != null && totalQuestions != null && (
        <span className="tabular-nums text-muted-foreground">
          {questionIndex} of {totalQuestions}
        </span>
      )}
    </div>
  );
}
