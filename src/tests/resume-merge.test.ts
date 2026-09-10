import { describe, expect, it } from "vitest";

import { mergeResponsesByRecency } from "@/features/interview/resume-merge";
import type { ResponseMap } from "@/domain/interview/types";

function response(text: string, updatedAt: string): ResponseMap[string] {
  return {
    questionId: "q5",
    value: { kind: "text", text },
    method: "typed",
    skipped: false,
    updatedAt,
  };
}

describe("mergeResponsesByRecency", () => {
  it("keeps the server answer when it is newer", () => {
    const server: ResponseMap = {
      q5: response("server answer", "2026-01-02T00:00:00.000Z"),
    };
    const local: ResponseMap = {
      q5: response("older local draft", "2026-01-01T00:00:00.000Z"),
    };
    expect(mergeResponsesByRecency(server, local).q5.value).toEqual({
      kind: "text",
      text: "server answer",
    });
  });

  it("keeps the local answer when it is newer (unsynced edit)", () => {
    const server: ResponseMap = {
      q5: response("stale server copy", "2026-01-01T00:00:00.000Z"),
    };
    const local: ResponseMap = {
      q5: response("newer local edit", "2026-01-02T00:00:00.000Z"),
    };
    expect(mergeResponsesByRecency(server, local).q5.value).toEqual({
      kind: "text",
      text: "newer local edit",
    });
  });

  it("keeps a local-only answer the server has never seen", () => {
    const server: ResponseMap = {};
    const local: ResponseMap = {
      q5: response("local only", "2026-01-01T00:00:00.000Z"),
    };
    expect(mergeResponsesByRecency(server, local).q5).toBeDefined();
  });

  it("keeps a server-only answer untouched by local", () => {
    const server: ResponseMap = {
      q6: response("server only", "2026-01-01T00:00:00.000Z"),
    };
    expect(mergeResponsesByRecency(server, {}).q6).toBeDefined();
  });
});
