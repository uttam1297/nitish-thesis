import "server-only";

import type { ResearchRepositories } from "@/lib/supabase/repositories";

export interface ExportRow {
  participantCode: string;
  responseMode: string;
  studyStage: string;
  role: string;
  industry: string;
  experience: string;
  questionId: string;
  questionVersion: string;
  construct: string;
  responseType: string;
  /** JSON-serialized `AnswerValue` (or `"[WITHDRAWN]"`). */
  responseValue: string;
  optionalElaboration: string;
  questionnaireVersion: string;
  sessionStatus: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Builds the flat, long-format dataset every export view is derived from
 * — one read of each table, joined in memory. Fine at thesis scale (see
 * README "Known limitations"); would not be fine at a much larger size.
 */
export async function buildExportRows(
  repositories: ResearchRepositories
): Promise<ExportRow[]> {
  const [sessions, participants] = await Promise.all([
    repositories.sessions.listAll(),
    repositories.participants.listAll(),
  ]);
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  const responsesBySession = await Promise.all(
    sessions.map((session) => repositories.responses.listBySession(session.id))
  );

  const rows: ExportRow[] = [];
  sessions.forEach((session, index) => {
    const participant = participantsById.get(session.participantId);
    for (const response of responsesBySession[index]) {
      rows.push({
        participantCode: participant?.participantCode ?? "",
        responseMode: session.responseMode,
        studyStage: session.studyStage,
        role: participant?.role ?? "",
        industry: participant?.industry ?? "",
        experience: participant?.experience ?? "",
        questionId: response.questionId,
        questionVersion: response.questionVersion,
        construct: response.construct,
        responseType: response.responseType,
        responseValue:
          typeof response.responseValue === "string"
            ? response.responseValue
            : JSON.stringify(response.responseValue),
        optionalElaboration: response.optionalElaboration ?? "",
        questionnaireVersion: session.questionnaireVersion,
        sessionStatus: session.status,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      });
    }
  });
  return rows;
}

/** RFC 4180-ish CSV escaping: wrap in quotes, double up embedded quotes. */
export function toCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(toCsvCell).join(","));
  return lines.join("\n") + "\n";
}
