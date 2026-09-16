import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildPublicResponseRows } from "./privacy";

describe("public dashboard safety boundaries", () => {
  it("contains no database mutation calls in the production dashboard source", () => {
    const repository = readFileSync(
      new URL("../supabase/repository.ts", import.meta.url),
      "utf8"
    );
    for (const operation of ["insert", "update", "upsert", "delete", "rpc"]) {
      expect(repository).not.toContain(`.${operation}(`);
    }
  });

  it("does not include internal IDs in the public response shape", () => {
    const source = buildPublicResponseRows.toString();
    expect(source).not.toContain("sessionId");
    expect(source).not.toContain("participantId");
    expect(source).not.toContain("resume_token_hash");
    expect(source).not.toContain("client_request_id");
  });
});
