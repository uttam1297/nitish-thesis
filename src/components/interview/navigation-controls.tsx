import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface NavigationControlsProps {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function NavigationControls({
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  onSkip,
  skipLabel = "Skip for now",
}: NavigationControlsProps) {
  return (
    <nav
      aria-label="Interview navigation"
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"
    >
      <div>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back
          </Button>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {onSkip && (
          <Button variant="ghost" onClick={onSkip}>
            {skipLabel}
          </Button>
        )}
        <Button onClick={onContinue} disabled={continueDisabled}>
          {continueLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
