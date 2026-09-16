import { concatFrames, rms } from "@/features/voice/audio";
import {
  MIN_SEGMENT_PEAK_RMS,
  MIN_SEGMENT_SECONDS,
  SEGMENT_MAX_SECONDS,
  SEGMENT_MIN_SECONDS,
  SEGMENT_PAUSE_SECONDS,
  SILENCE_RMS,
} from "@/features/voice/speech-config";

export interface AudioSegment {
  pcm: Float32Array;
  sampleRate: number;
  durationSeconds: number;
}

/**
 * Cuts a continuous microphone stream into segments Whisper can transcribe in
 * one pass, so a long answer produces text progressively instead of one very
 * slow inference at the end. Cuts are made at a pause where possible and are
 * forced before the model's 30-second window is exceeded.
 */
export class AudioSegmenter {
  private frames: Float32Array[] = [];
  private frameCount = 0;
  private pauseSamples = 0;
  private peak = 0;

  constructor(
    private readonly sampleRate: number,
    private readonly onSegment: (segment: AudioSegment) => void
  ) {}

  /** Returns the frame's level (0-1) so callers can drive a meter for free. */
  push(frame: Float32Array): number {
    const level = rms(frame);
    this.frames.push(frame);
    this.frameCount += frame.length;
    this.peak = Math.max(this.peak, level);
    this.pauseSamples =
      level < SILENCE_RMS ? this.pauseSamples + frame.length : 0;

    const seconds = this.frameCount / this.sampleRate;
    const pausedFor = this.pauseSamples / this.sampleRate;
    if (
      seconds >= SEGMENT_MAX_SECONDS ||
      (seconds >= SEGMENT_MIN_SECONDS && pausedFor >= SEGMENT_PAUSE_SECONDS)
    ) {
      this.emit();
    }
    return level;
  }

  flush(): void {
    this.emit();
  }

  private emit(): void {
    const samples = this.frameCount;
    const frames = this.frames;
    const peak = this.peak;
    this.frames = [];
    this.frameCount = 0;
    this.pauseSamples = 0;
    this.peak = 0;

    const durationSeconds = samples / this.sampleRate;
    // Whisper reliably hallucinates a phrase ("Thank you.", "You") from near
    // silence, so anything too short or too quiet is dropped before inference.
    if (durationSeconds < MIN_SEGMENT_SECONDS || peak < MIN_SEGMENT_PEAK_RMS) {
      return;
    }
    this.onSegment({
      pcm: concatFrames(frames, samples),
      sampleRate: this.sampleRate,
      durationSeconds,
    });
  }
}
