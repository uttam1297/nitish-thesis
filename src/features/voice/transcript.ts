/**
 * Merges a transcribed segment into whatever the participant currently has in
 * the textarea. The textarea is the source of truth: existing text is never
 * rewritten, only extended.
 */
export function appendTranscript(existing: string, segment: string): string {
  const addition = segment.trim();
  if (!addition) return existing;

  const base = existing.replace(/[ \t]+$/, "");
  if (!base) return addition;

  // Whisper punctuates each segment, so the join only has to supply spacing —
  // and must not add one where the participant left the cursor mid-word.
  const separator = /\n$/.test(base) ? "" : " ";
  return `${base}${separator}${addition}`;
}
