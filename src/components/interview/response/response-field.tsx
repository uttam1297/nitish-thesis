"use client";

import type { ComponentType } from "react";

import { responseFieldRegistry } from "@/components/interview/response/registry";
import type { ResponseFieldProps } from "@/components/interview/response/types";

/**
 * Renders the field configured for a question.
 *
 * The registry is keyed by response type and each entry is typed to its own
 * question and answer shape. TypeScript cannot prove the lookup and the props
 * refer to the same union member, so the correlation is asserted exactly once,
 * here, rather than repeated at every call site.
 */
export function ResponseField(props: ResponseFieldProps) {
  const Field = responseFieldRegistry[
    props.question.responseType
  ] as ComponentType<ResponseFieldProps>;

  return <Field {...props} />;
}
