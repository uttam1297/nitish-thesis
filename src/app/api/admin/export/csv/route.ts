import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/supabase/admin-guard";
import { toSafeApiError } from "@/lib/supabase/api-errors";
import { buildExportRows, rowsToCsv } from "@/lib/supabase/export-data";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

const HEADERS = [
  "participant_code",
  "response_mode",
  "role",
  "industry",
  "question_id",
  "construct",
  "response_type",
  "response",
  "questionnaire_version",
  "timestamp",
];

/** Structured, analysis-ready CSV — see README "Export architecture". */
export async function GET() {
  try {
    await requireAdminSession();
    const rows = await buildExportRows(createRepositories());

    const csv = rowsToCsv(
      HEADERS,
      rows.map((row) => [
        row.participantCode,
        row.responseMode,
        row.role,
        row.industry,
        row.questionId,
        row.construct,
        row.responseType,
        row.responseValue,
        row.questionnaireVersion,
        row.updatedAt,
      ])
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="responses.csv"`,
      },
    });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not generate the export.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
