"use client";

import { useEffect, useId, useRef } from "react";

import { StatusMessage } from "@/components/feedback/status-message";
import { VoiceButton } from "@/components/interview/voice-button";
import type { ResponseFieldProps } from "@/components/interview/response/types";
import { Label } from "@/components/ui/label";
import { TextArea } from "@/components/ui/textarea";
import { appendTranscript } from "@/features/voice/transcript";
import { useVoiceInput } from "@/features/voice/use-voice-input";

/**
 * Voice is an optional input method layered over a plain textarea, which
 * remains the source of truth: transcribed segments are appended to whatever
 * the participant has typed or corrected, and the question is fully
 * answerable by typing whether or not voice is available.
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
  const notApplicableId = useId();
  const isNotApplicable = value.kind === "not_applicable";
  const text = value.kind === "text" ? value.text : "";

  // Transcription resolves asynchronously, so the merge has to read the text
  // as it is at that moment — not as it was when recording started.
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const usedVoice = useRef(false);

  const voice = useVoiceInput({
    onTranscript: (segment) => {
      usedVoice.current = true;
      onChange(
        { kind: "text", text: appendTranscript(textRef.current, segment) },
        "voice"
      );
    },
  });

  const showVoice =
    question.allowVoice && !isNotApplicable && voice.status !== "unavailable";

  return (
    <div role="group" aria-labelledby={labelledBy} className="grid gap-3">
      {showVoice && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <VoiceButton
              status={voice.status}
              level={voice.level}
              elapsedSeconds={voice.elapsedSeconds}
              isPreparing={voice.isPreparing}
              onStart={() => void voice.start()}
              onStop={voice.stop}
            />
            <span className="text-xs text-muted-foreground">or type below</span>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Your voice is transcribed on your own device. No audio is sent or
            stored, and nothing is saved until you review the text.
          </p>
          {voice.errorMessage && (
            <StatusMessage variant="warning">
              {voice.errorMessage}
            </StatusMessage>
          )}
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={answerId}>Your answer</Label>
        <TextArea
          id={answerId}
          value={text}
          disabled={isNotApplicable}
          className="min-h-28"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={question.placeholder}
          onChange={(event) =>
            onChange(
              { kind: "text", text: event.target.value },
              usedVoice.current ? "voice_edited" : "typed"
            )
          }
        />
        {voice.isTranscribing && (
          <span className="text-xs text-muted-foreground">
            Processing voice… you can keep typing.
          </span>
        )}
      </div>

      {question.allowNotApplicable && (
        <div className="rounded-md border bg-surface-subtle px-3 py-3">
          <label
            htmlFor={notApplicableId}
            className="flex cursor-pointer items-start gap-3 text-sm"
          >
            <input
              id={notApplicableId}
              type="checkbox"
              checked={isNotApplicable}
              className="mt-0.5 size-4 accent-primary"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? {
                        kind: "not_applicable",
                        reason: "not_applicable",
                      }
                    : { kind: "text", text: "" },
                  "selected"
                )
              }
            />
            <span>
              <span className="font-medium">
                This question is not applicable to my experience.
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Select this only when you cannot answer from your professional
                experience.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
