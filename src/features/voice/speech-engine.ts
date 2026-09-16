"use client";

import { MODEL_LOAD_TIMEOUT_MS } from "@/features/voice/speech-config";
import type {
  SpeechDevice,
  SpeechWorkerRequest,
  SpeechWorkerResponse,
} from "@/features/voice/speech-protocol";

export type SpeechEngineStatus = "idle" | "preparing" | "ready" | "unavailable";

export interface SpeechEngine {
  status: SpeechEngineStatus;
  subscribe(listener: (status: SpeechEngineStatus) => void): () => void;
  /** Resolves true once the model can transcribe, false if it never will. */
  prepare(): Promise<boolean>;
  transcribe(audio: Float32Array, sampleRate: number): Promise<string>;
  dispose(): void;
}

interface PendingRequest {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}

/** Structural stand-in: the DOM lib this project targets has no WebGPU types. */
interface GpuLike {
  requestAdapter(): Promise<unknown>;
}

async function hasWebGpuAdapter(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: GpuLike }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

/**
 * Owns the single speech worker for the whole application: one worker, one
 * loaded model, however many interview questions.
 *
 * Each load attempt gets a fresh worker, because Transformers.js serialises
 * session creation through one promise chain and cannot create a session in a
 * context where an earlier one failed. The attempts are a fixed list — WebGPU
 * where an adapter exists, then WASM, then one WASM retry for a transient
 * network failure — so a device that cannot run the model settles on
 * "unavailable" rather than re-downloading tens of megabytes in a loop.
 */
class WorkerSpeechEngine implements SpeechEngine {
  status: SpeechEngineStatus = "idle";

  private worker: Worker | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly listeners = new Set<(status: SpeechEngineStatus) => void>();
  private ready: Promise<boolean> | null = null;
  private nextId = 0;

  subscribe(listener: (status: SpeechEngineStatus) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  prepare(): Promise<boolean> {
    if (this.status === "unavailable") return Promise.resolve(false);
    this.ready ??= this.loadFirstWorkingDevice();
    return this.ready;
  }

  async transcribe(audio: Float32Array, sampleRate: number): Promise<string> {
    const worker = (await this.prepare()) ? this.worker : null;
    if (!worker) throw new Error("MODEL_LOAD_FAILED");

    const id = String(this.nextId++);
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // The buffer is transferred, not copied: the audio exists in exactly one
      // place and is released as soon as the worker is done with it.
      worker.postMessage({ type: "transcribe", id, audio, sampleRate }, [
        audio.buffer,
      ]);
    });
  }

  dispose() {
    this.rejectPending();
    this.worker?.postMessage({ type: "dispose" } satisfies SpeechWorkerRequest);
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.setStatus("idle");
  }

  private async loadFirstWorkingDevice(): Promise<boolean> {
    this.setStatus("preparing");

    const devices: SpeechDevice[] = (await hasWebGpuAdapter())
      ? ["webgpu", "wasm", "wasm"]
      : ["wasm", "wasm"];

    for (const device of devices) {
      if (await this.loadOn(device)) {
        this.setStatus("ready");
        return true;
      }
    }

    this.rejectPending();
    this.setStatus("unavailable");
    return false;
  }

  private loadOn(device: SpeechDevice): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let worker: Worker;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (!ok) {
          worker.terminate();
          if (this.worker === worker) this.worker = null;
        }
        resolve(ok);
      };
      const timer = window.setTimeout(
        () => finish(false),
        MODEL_LOAD_TIMEOUT_MS
      );

      try {
        worker = this.spawn((message) => {
          if (message.type === "ready") finish(true);
          else if (message.type === "error" && !message.id) finish(false);
        });
      } catch {
        window.clearTimeout(timer);
        resolve(false);
        return;
      }

      worker.postMessage({
        type: "initialize",
        device,
      } satisfies SpeechWorkerRequest);
    });
  }

  private spawn(onLifecycle: (message: SpeechWorkerResponse) => void): Worker {
    const worker = new Worker(new URL("./speech.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener(
      "message",
      (event: MessageEvent<SpeechWorkerResponse>) => {
        const message = event.data;
        if (message.type === "transcription") {
          this.pending.get(message.id)?.resolve(message.text);
          this.pending.delete(message.id);
        } else if (message.type === "error" && message.id) {
          this.pending.get(message.id)?.reject(new Error(message.code));
          this.pending.delete(message.id);
        }
        onLifecycle(message);
      }
    );
    worker.addEventListener("error", () => {
      onLifecycle({ type: "error", code: "MODEL_LOAD_FAILED" });
    });
    this.worker = worker;
    return worker;
  }

  private rejectPending() {
    for (const request of this.pending.values()) {
      request.reject(new Error("MODEL_LOAD_FAILED"));
    }
    this.pending.clear();
  }

  private setStatus(status: SpeechEngineStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}

let engine: SpeechEngine | null = null;

export function getSpeechEngine(): SpeechEngine {
  engine ??= new WorkerSpeechEngine();
  return engine;
}

/** Tests replace the engine rather than the worker boundary. */
export function setSpeechEngine(next: SpeechEngine | null) {
  engine = next;
}
