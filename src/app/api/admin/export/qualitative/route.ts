import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/supabase/admin-guard";
import { toSafeApiError } from "@/lib/supabase/api-errors";
import { buildExportRows, rowsToCsv } from "@/lib/supabase/export-data";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

const HEADERS = [
  "Participant",
  "Construct",
  "Question",
  "Response",
  "Collection mode",
];

/**
 * Qualitative-coding-friendly long format: one row per response, minimal
 * columns, human-readable. Derived from the same canonical data as the
 * structured CSV — never a separately-maintained copy.
 */
export async function GET() {
  try {
    await requireAdminSession();
    const rows = await buildExportRows(createRepositories());

    const csv = rowsToCsv(
      HEADERS,
      rows.map((row) => [
        row.participantCode,
        row.construct,
        row.questionId,
        row.responseValue,
        row.responseMode,
      ])
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="responses-qualitative.csv"`,
      },
    });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not generate the export.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
