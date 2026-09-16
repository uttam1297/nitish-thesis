import { describe, expect, it, vi } from "vitest";

import { resamplePcm, rms } from "@/features/voice/audio";
import {
  AudioSegmenter,
  type AudioSegment,
} from "@/features/voice/audio-segmenter";
import {
  SEGMENT_MAX_SECONDS,
  SEGMENT_MIN_SECONDS,
  TARGET_SAMPLE_RATE,
} from "@/features/voice/speech-config";

const FRAME = 1_600; // 0.1 s at 16 kHz

function speech(length = FRAME): Float32Array {
  const frame = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    frame[i] = 0.2 * Math.sin((2 * Math.PI * 220 * i) / TARGET_SAMPLE_RATE);
  }
  return frame;
}

function silence(length = FRAME): Float32Array {
  return new Float32Array(length);
}

function push(segmenter: AudioSegmenter, frame: Float32Array, seconds: number) {
  for (let i = 0; i < seconds * 10; i += 1) segmenter.push(frame);
}

describe("AudioSegmenter", () => {
  it("cuts at a pause once the minimum segment length is reached", () => {
    const onSegment = vi.fn<(segment: AudioSegment) => void>();
    const segmenter = new AudioSegmenter(TARGET_SAMPLE_RATE, onSegment);

    push(segmenter, speech(), SEGMENT_MIN_SECONDS);
    expect(onSegment).not.toHaveBeenCalled();

    push(segmenter, silence(), 1);
    expect(onSegment).toHaveBeenCalledOnce();
    expect(onSegment.mock.calls[0][0].durationSeconds).toBeLessThan(
      SEGMENT_MAX_SECONDS
    );
  });

  it("forces a cut before Whisper's 30-second window", () => {
    const onSegment = vi.fn<(segment: AudioSegment) => void>();
    const segmenter = new AudioSegmenter(TARGET_SAMPLE_RATE, onSegment);

    push(segmenter, speech(), SEGMENT_MAX_SECONDS + 1);
    expect(onSegment).toHaveBeenCalledOnce();
    expect(onSegment.mock.calls[0][0].durationSeconds).toBeLessThanOrEqual(
      SEGMENT_MAX_SECONDS + 0.1
    );
  });

  it("drops a very short tap on the microphone instead of transcribing it", () => {
    const onSegment = vi.fn();
    const segmenter = new AudioSegmenter(TARGET_SAMPLE_RATE, onSegment);

    segmenter.push(speech());
    segmenter.flush();
    expect(onSegment).not.toHaveBeenCalled();
  });

  it("drops near-silence, which Whisper would otherwise hallucinate over", () => {
    const onSegment = vi.fn();
    const segmenter = new AudioSegmenter(TARGET_SAMPLE_RATE, onSegment);

    push(segmenter, silence(), 5);
    segmenter.flush();
    expect(onSegment).not.toHaveBeenCalled();
  });

  it("flushes the trailing audio so the last sentence is not lost", () => {
    const onSegment = vi.fn<(segment: AudioSegment) => void>();
    const segmenter = new AudioSegmenter(TARGET_SAMPLE_RATE, onSegment);

    push(segmenter, speech(), 3);
    segmenter.flush();
    expect(onSegment).toHaveBeenCalledOnce();
    expect(onSegment.mock.calls[0][0].pcm).toHaveLength(3 * TARGET_SAMPLE_RATE);
  });
});

describe("resamplePcm", () => {
  it("returns the input untouched when the rate already matches", () => {
    const input = speech();
    expect(resamplePcm(input, TARGET_SAMPLE_RATE, TARGET_SAMPLE_RATE)).toBe(
      input
    );
  });

  it("downsamples 48 kHz capture to Whisper's rate while preserving level", () => {
    const input = speech(48_000);
    const output = resamplePcm(input, 48_000, TARGET_SAMPLE_RATE);

    expect(output).toHaveLength(TARGET_SAMPLE_RATE);
    expect(rms(output)).toBeGreaterThan(0.05);
  });
});
