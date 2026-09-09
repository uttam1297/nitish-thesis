"use client";

import { useId } from "react";

import type { ResponseFieldProps } from "@/components/interview/response/types";
import { Label } from "@/components/ui/label";
import { TextArea } from "@/components/ui/textarea";
import { TextInput } from "@/components/ui/input";
import type { ResponseMethod, TextValidation } from "@/domain/interview/types";

interface TextFieldProps {
  label: string;
  text: string;
  placeholder?: string;
  validation?: TextValidation;
  multiline: boolean;
  describedBy?: string;
  invalid: boolean;
  onText: (text: string, method: ResponseMethod) => void;
}

function TextField({
  label,
  text,
  placeholder,
  validation,
  multiline,
  describedBy,
  invalid,
  onText,
}: TextFieldProps) {
  const answerId = useId();
  const counterId = useId();
  const maxLength = validation?.maxLength;

  const shared = {
    id: answerId,
    value: text,
    maxLength,
    placeholder,
    "aria-invalid": invalid || undefined,
    "aria-describedby":
      [describedBy, maxLength ? counterId : null].filter(Boolean).join(" ") ||
      undefined,
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={answerId}>{label}</Label>
      {multiline ? (
        <TextArea
          {...shared}
          onChange={(event) => onText(event.target.value, "typed")}
        />
      ) : (
        <TextInput
          {...shared}
          onChange={(event) => onText(event.target.value, "typed")}
        />
      )}
      {maxLength !== undefined && (
        <p id={counterId} className="text-xs text-muted-foreground">
          {text.length} of {maxLength} characters
        </p>
      )}
    </div>
  );
}

export function ShortTextField({
  question,
  value,
  onChange,
  describedBy,
  invalid,
}: ResponseFieldProps<"short_text">) {
  return (
    <TextField
      label="Your answer"
      multiline={false}
      text={value.text}
      placeholder={question.placeholder}
      validation={question.validation}
      describedBy={describedBy}
      invalid={invalid}
      onText={(text, method) => onChange({ kind: "text", text }, method)}
    />
  );
}

export function LongTextField({
  question,
  value,
  onChange,
  describedBy,
  invalid,
}: ResponseFieldProps<"long_text">) {
  return (
    <TextField
      label="Your answer"
      multiline
      text={value.text}
      placeholder={question.placeholder}
      validation={question.validation}
      describedBy={describedBy}
      invalid={invalid}
      onText={(text, method) => onChange({ kind: "text", text }, method)}
    />
  );
}

export function OptionalElaborationField({
  question,
  value,
  onChange,
  describedBy,
  invalid,
}: ResponseFieldProps<"optional_elaboration">) {
  return (
    <TextField
      label="Your answer (optional)"
      multiline
      text={value.text}
      placeholder={question.placeholder}
      validation={question.validation}
      describedBy={describedBy}
      invalid={invalid}
      onText={(text, method) => onChange({ kind: "text", text }, method)}
    />
  );
}
