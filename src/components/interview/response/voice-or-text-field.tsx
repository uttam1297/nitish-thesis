"use client";

import { useId } from "react";

import { StatusMessage } from "@/components/feedback/status-message";
import { VoiceButton } from "@/components/interview/voice-button";
import type { ResponseFieldProps } from "@/components/interview/response/types";
import { Label } from "@/components/ui/label";
import { TextArea } from "@/components/ui/textarea";
import { useVoiceInput } from "@/features/voice/use-voice-input";

/**
 * Voice is an optional input method layered over a plain textarea, which
 * remains the source of truth: the participant always sees and can edit
 * the transcript before continuing, and the question is fully answerable
 * by typing whether or not voice is available.
 */
export function VoiceOrTextField({
  question,
  value,
  onChange,
  labelledBy,
  describedBy,
  invalid,
}: ResponseFieldProps<"voice_or_text">) {
  const answerId = useId();
  const voice = useVoiceInput({
    onCapture: (text) => {
      onChange(
        {
          kind: "text",
          text,
        },
        "voice"
      );
    },
  });

  const showVoice = question.allowVoice && voice.state !== "unsupported";

  return (
    <div role="group" aria-labelledby={labelledBy} className="grid gap-5">
      {showVoice && (
        <div className="grid gap-2">
          <VoiceButton
            state={voice.state}
            elapsedSeconds={voice.elapsedSeconds}
            onStart={voice.start}
            onStop={voice.stop}
          />
          <p className="text-xs text-muted-foreground">
            Voice uses your browser&rsquo;s built-in speech recognition, which
            may process audio via your browser or device vendor rather than this
            application. Nothing is stored until you see and can edit the text
            below.
          </p>
        </div>
      )}

      {showVoice && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or type</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor={answerId}>Your answer</Label>
        <TextArea
          id={answerId}
          value={value.text}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={question.placeholder}
          onChange={(event) =>
            onChange(
              { kind: "text", text: event.target.value },
              value.text && voice.state === "completed"
                ? "voice_edited"
                : "typed"
            )
          }
        />
        <p className="text-xs text-muted-foreground">
          You can edit anything here before continuing.
        </p>
      </div>

      {voice.state === "completed" && (
        <StatusMessage variant="success">
          Transcript added. You can edit the text before continuing.
        </StatusMessage>
      )}
      {voice.state === "error" && voice.errorMessage && (
        <StatusMessage variant="warning">{voice.errorMessage}</StatusMessage>
      )}
    </div>
  );
}
