"use client";

import type { ComponentType } from "react";

import { LikertScaleField } from "@/components/interview/response/likert-field";
import { RankingField } from "@/components/interview/response/ranking-field";
import {
  MultiSelectField,
  SingleSelectField,
} from "@/components/interview/response/select-fields";
import {
  LongTextField,
  OptionalElaborationField,
  ShortTextField,
} from "@/components/interview/response/text-field";
import type { ResponseFieldProps } from "@/components/interview/response/types";
import { VoiceOrTextField } from "@/components/interview/response/voice-or-text-field";
import type { ResponseType } from "@/domain/interview/types";

/**
 * Response type to component map.
 *
 * The mapped type forces an entry for every response type: adding one to the
 * domain union is a compile error here until a field exists for it. Dispatch
 * happens in `ResponseField` by table lookup, so no screen ever branches on
 * response type.
 */
export type ResponseFieldRegistry = {
  [T in ResponseType]: ComponentType<ResponseFieldProps<T>>;
};

export const responseFieldRegistry: ResponseFieldRegistry = {
  single_select: SingleSelectField,
  multi_select: MultiSelectField,
  likert_scale: LikertScaleField,
  ranking: RankingField,
  short_text: ShortTextField,
  long_text: LongTextField,
  voice_or_text: VoiceOrTextField,
  optional_elaboration: OptionalElaborationField,
};
