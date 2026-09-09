import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  percent: number;
  section: string;
}

export function ProgressIndicator({
  percent,
  section,
}: ProgressIndicatorProps) {
  return <Progress value={percent} label={`Current section: ${section}`} />;
}
