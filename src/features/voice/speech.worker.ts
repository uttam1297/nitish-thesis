/// <reference lib="webworker" />

import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";

import { resamplePcm } from "@/features/voice/audio";
import {
  SPEECH_MODEL_ID,
  SPEECH_MODEL_PATH,
  SPEECH_WASM_PATH,
  TARGET_SAMPLE_RATE,
} from "@/features/voice/speech-config";
import type {
  SpeechDevice,
  SpeechWorkerRequest,
  SpeechWorkerResponse,
} from "@/features/voice/speech-protocol";

// Everything is served from this deployment: no request ever reaches the
// Hugging Face CDN, in development or in production.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = SPEECH_MODEL_PATH;

const onnxWasm = env.backends.onnx.wasm;
if (onnxWasm) {
  // Threads would need cross-origin isolation (COOP/COEP), which the rest of
  // the app does not opt into, so the single-threaded build is the honest
  // default rather than a silently failing multi-threaded one.
  onnxWasm.numThreads = 1;
}

/**
 * The execution provider is chosen by the client and fixed for the lifetime of
 * this worker. Transformers.js serialises session creation through a single
 * promise chain, so one rejected attempt keeps rejecting every later one:
 * falling back from WebGPU to WASM has to happen in a fresh worker, which the
 * client handles by replacing this one.
 */
let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loading: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function load(device: SpeechDevice) {
  if (onnxWasm) {
    // The asyncify build is required by the WebGPU execution provider; the
    // plain build is ~12 MB smaller and enough for the WASM path.
    const suffix = device === "webgpu" ? ".asyncify" : "";
    onnxWasm.wasmPaths = {
      mjs: `${SPEECH_WASM_PATH}ort-wasm-simd-threaded${suffix}.mjs`,
      wasm: `${SPEECH_WASM_PATH}ort-wasm-simd-threaded${suffix}.wasm`,
    };
  }

  loading ??= pipeline("automatic-speech-recognition", SPEECH_MODEL_ID, {
    device,
    dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
  }).then(async (instance) => {
    // An adapter can be reported as available and still fail on the first real
    // inference (driver quirks, unsupported int8 kernels). One short pass here
    // moves that failure into the client's fallback path instead of into a
    // participant's first answer.
    await instance(new Float32Array(TARGET_SAMPLE_RATE));
    transcriber = instance;
    return instance;
  });

  return loading;
}

function post(message: SpeechWorkerResponse) {
  self.postMessage(message);
}

self.addEventListener("message", (event: MessageEvent<SpeechWorkerRequest>) => {
  const request = event.data;

  if (request.type === "initialize") {
    void load(request.device).then(
      () => post({ type: "ready", device: request.device }),
      () => post({ type: "error", code: "MODEL_LOAD_FAILED" })
    );
    return;
  }

  if (request.type === "transcribe") {
    const instance = transcriber;
    if (!instance) {
      post({ type: "error", id: request.id, code: "TRANSCRIPTION_FAILED" });
      return;
    }
    void (async () => {
      const audio = resamplePcm(
        request.audio,
        request.sampleRate,
        TARGET_SAMPLE_RATE
      );
      const result = await instance(audio);
      post({
        type: "transcription",
        id: request.id,
        text: Array.isArray(result) ? result[0].text : result.text,
      });
    })().catch(() => {
      post({ type: "error", id: request.id, code: "TRANSCRIPTION_FAILED" });
    });
    return;
  }

  transcriber?.dispose();
  transcriber = null;
  self.close();
});
