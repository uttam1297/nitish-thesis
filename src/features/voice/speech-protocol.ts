/** Internal diagnostics codes. None of these reach a participant verbatim. */
export type VoiceErrorCode =
  | "MIC_PERMISSION_DENIED"
  | "MIC_NOT_FOUND"
  | "MIC_UNSUPPORTED"
  | "AUDIO_PROCESSING_FAILED"
  | "MODEL_LOAD_FAILED"
  | "TRANSCRIPTION_FAILED";

export type SpeechDevice = "webgpu" | "wasm";

export type SpeechWorkerRequest =
  | { type: "initialize"; device: SpeechDevice }
  | {
      type: "transcribe";
      id: string;
      /** Mono PCM at `sampleRate`; resampled inside the worker. */
      audio: Float32Array;
      sampleRate: number;
    }
  | { type: "dispose" };

export type SpeechWorkerResponse =
  | { type: "ready"; device: SpeechDevice }
  | { type: "transcription"; id: string; text: string }
  | { type: "error"; id?: string; code: VoiceErrorCode };
