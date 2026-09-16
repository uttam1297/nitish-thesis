/**
 * Pure audio helpers shared by the microphone session (main thread) and the
 * speech worker. No browser APIs, so both sides — and the tests — can use them.
 */

export function rms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

export function concatFrames(
  frames: Float32Array[],
  length: number
): Float32Array {
  const merged = new Float32Array(length);
  let offset = 0;
  for (const frame of frames) {
    merged.set(frame, offset);
    offset += frame.length;
  }
  return merged;
}

/**
 * Resamples mono PCM. Downsampling averages each source window before picking
 * a sample, which suppresses the aliasing that plain decimation from 44.1/48
 * kHz to Whisper's 16 kHz would otherwise fold into the speech band.
 */
export function resamplePcm(
  input: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate || input.length === 0) return input;

  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  if (ratio < 1.5) {
    for (let i = 0; i < outputLength; i += 1) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      const next = Math.min(index + 1, input.length - 1);
      output[i] = input[index] * (1 - fraction) + input[next] * fraction;
    }
    return output;
  }

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = sum / Math.max(1, end - start);
  }
  return output;
}
