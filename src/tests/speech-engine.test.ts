import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSpeechEngine,
  setSpeechEngine,
} from "@/features/voice/speech-engine";
import type {
  SpeechWorkerRequest,
  SpeechWorkerResponse,
} from "@/features/voice/speech-protocol";

const workers: FakeWorker[] = [];

class FakeWorker implements Pick<Worker, "postMessage" | "terminate"> {
  readonly sent: SpeechWorkerRequest[] = [];
  terminated = false;
  private listeners: ((event: MessageEvent<SpeechWorkerResponse>) => void)[] =
    [];

  constructor() {
    workers.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent<SpeechWorkerResponse>) => void
  ) {
    if (type === "message") this.listeners.push(listener);
  }

  postMessage(request: SpeechWorkerRequest) {
    this.sent.push(request);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: SpeechWorkerResponse) {
    for (const listener of this.listeners) {
      listener({ data: message } as MessageEvent<SpeechWorkerResponse>);
    }
  }
}

vi.stubGlobal("Worker", FakeWorker);

afterEach(() => {
  setSpeechEngine(null);
  workers.length = 0;
});

describe("speech engine worker client", () => {
  it("initialises once and reports ready", async () => {
    const engine = getSpeechEngine();
    const ready = engine.prepare();
    void engine.prepare();

    await vi.waitFor(() => expect(workers).toHaveLength(1));
    expect(workers[0].sent).toEqual([{ type: "initialize", device: "wasm" }]);

    workers[0].emit({ type: "ready", device: "wasm" });
    await expect(ready).resolves.toBe(true);
    expect(engine.status).toBe("ready");
  });

  it("routes a transcription request and its response by id", async () => {
    const engine = getSpeechEngine();
    const ready = engine.prepare();
    await vi.waitFor(() => expect(workers).toHaveLength(1));
    workers[0].emit({ type: "ready", device: "wasm" });
    await ready;

    const result = engine.transcribe(new Float32Array(1_600), 16_000);
    await vi.waitFor(() => expect(workers[0].sent).toHaveLength(2));

    const request = workers[0].sent[1];
    if (request.type !== "transcribe")
      throw new Error("expected a transcribe request");
    expect(request.sampleRate).toBe(16_000);

    workers[0].emit({ type: "transcription", id: request.id, text: " hello " });
    await expect(result).resolves.toBe(" hello ");
  });

  it("retries a failed load exactly once before disabling voice", async () => {
    const engine = getSpeechEngine();
    const ready = engine.prepare();

    await vi.waitFor(() => expect(workers).toHaveLength(1));
    workers[0].emit({ type: "error", code: "MODEL_LOAD_FAILED" });
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    workers[1].emit({ type: "error", code: "MODEL_LOAD_FAILED" });

    await expect(ready).resolves.toBe(false);
    expect(engine.status).toBe("unavailable");
    expect(workers).toHaveLength(2);

    // A later click must not start another download loop.
    await expect(engine.prepare()).resolves.toBe(false);
    expect(workers).toHaveLength(2);
  });

  it("rejects pending transcriptions when the model fails mid-flight", async () => {
    const engine = getSpeechEngine();
    const ready = engine.prepare();
    await vi.waitFor(() => expect(workers).toHaveLength(1));
    workers[0].emit({ type: "ready", device: "wasm" });
    await ready;

    const result = engine.transcribe(new Float32Array(1_600), 16_000);
    await vi.waitFor(() => expect(workers[0].sent).toHaveLength(2));
    const request = workers[0].sent[1];
    if (request.type !== "transcribe")
      throw new Error("expected a transcribe request");

    workers[0].emit({
      type: "error",
      id: request.id,
      code: "TRANSCRIPTION_FAILED",
    });
    await expect(result).rejects.toThrow("TRANSCRIPTION_FAILED");
  });
});
