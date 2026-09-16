/**
 * Shared constants for on-device speech input. The model directory name is
 * versioned so that replacing the weights changes every asset URL, which is
 * what makes the immutable cache headers in next.config.ts safe.
 *
 * Keep MODEL_DIR in sync with scripts/fetch-speech-assets.mjs.
 */
export const SPEECH_MODEL_ID = "whisper-tiny-en-v1";
export const SPEECH_MODEL_PATH = "/models/";
export const SPEECH_WASM_PATH = "/wasm/";

export const TARGET_SAMPLE_RATE = 16_000;

/**
 * Whisper reads 30-second windows, so a segment must stay under that to be
 * transcribed in one pass. The lower bound keeps sentences intact: a segment
 * is only cut early when the participant has paused.
 */
export const SEGMENT_MIN_SECONDS = 12;
export const SEGMENT_MAX_SECONDS = 28;
/** A pause this long after the minimum length ends the segment. */
export const SEGMENT_PAUSE_SECONDS = 0.6;

/** Below this RMS a frame counts as a pause rather than speech. */
export const SILENCE_RMS = 0.006;
/** Segments quieter or shorter than this are discarded without inference. */
export const MIN_SEGMENT_SECONDS = 0.8;
export const MIN_SEGMENT_PEAK_RMS = 0.012;

/** Give up on a model that has not loaded by then and fall back to typing. */
export const MODEL_LOAD_TIMEOUT_MS = 90_000;
