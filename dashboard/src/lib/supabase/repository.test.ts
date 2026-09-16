import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./server-client", () => ({ getDashboardSupabaseClient: vi.fn() }));

import { DashboardDataError, listSessions } from "./repository";

function clientWith(result: unknown) {
  const order = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select };
}

describe("read-only research repository", () => {
  it("uses an explicit session projection that excludes credential fields", async () => {
    const { client, from, select } = clientWith({ data: [], error: null });
    await listSessions(client as never);

    expect(from).toHaveBeenCalledWith("sessions");
    expect(select).toHaveBeenCalledWith(
      expect.not.stringContaining("resume_token_hash"),
    );
    expect(select).toHaveBeenCalledWith(
      expect.not.stringContaining("client_request_id"),
    );
  });

  it("distinguishes a valid empty result from a database failure", async () => {
    const empty = clientWith({ data: [], error: null });
    await expect(listSessions(empty.client as never)).resolves.toEqual([]);

    const failed = clientWith({ data: null, error: { message: "secret details" } });
    await expect(listSessions(failed.client as never)).rejects.toEqual(
      expect.objectContaining({
        name: "DashboardDataError",
        message: "Research data is temporarily unavailable.",
      }),
    );
    await expect(listSessions(failed.client as never)).rejects.toBeInstanceOf(
      DashboardDataError,
    );
  });
});
