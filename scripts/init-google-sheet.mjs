#!/usr/bin/env node
/**
 * One-time (and re-runnable) setup for a new research spreadsheet: creates
 * every tab this application expects and writes its header row.
 *
 * Usage:
 *   GOOGLE_PROJECT_ID=... GOOGLE_CLIENT_EMAIL=... GOOGLE_PRIVATE_KEY=... \
 *   GOOGLE_SPREADSHEET_ID=... node scripts/init-google-sheet.mjs
 *
 * Or with a local `.env` file loaded by your shell / `dotenv-cli`.
 *
 * Keep these header arrays in sync with `src/lib/google-sheets/sheet-schema.ts`
 * — this script is intentionally standalone (no TypeScript path aliases) so
 * it can run with plain Node, without a build step.
 */
import { google } from "googleapis";

const SHEETS = [
  {
    name: "Participants",
    headers: [
      "participant_id",
      "role",
      "industry",
      "experience",
      "closeness_to_discovery",
      "created_at",
    ],
  },
  {
    name: "Sessions",
    headers: [
      "session_id",
      "participant_id",
      "resume_token_hash",
      "questionnaire_version",
      "response_mode",
      "status",
      "current_question_id",
      "progress_percentage",
      "started_at",
      "last_activity_at",
      "completed_at",
      "withdrawn_at",
      "client_request_id",
      "study_stage",
    ],
  },
  {
    name: "Responses",
    headers: [
      "response_id",
      "participant_id",
      "session_id",
      "question_id",
      "question_version",
      "construct",
      "response_type",
      "response_value",
      "optional_elaboration",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "Consent",
    headers: [
      "consent_id",
      "participant_id",
      "session_id",
      "consent_version",
      "participation_consent",
      "voice_input_consent",
      "recording_consent",
      "consented_at",
    ],
  },
  {
    name: "Research_Metadata",
    headers: [
      "study_id",
      "study_title",
      "questionnaire_version",
      "consent_version",
      "created_at",
      "is_active",
      "next_participant_number",
    ],
  },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const projectId = requireEnv("GOOGLE_PROJECT_ID");
  const clientEmail = requireEnv("GOOGLE_CLIENT_EMAIL");
  const privateKeyRaw = requireEnv("GOOGLE_PRIVATE_KEY");
  const spreadsheetId = requireEnv("GOOGLE_SPREADSHEET_ID");
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    projectId,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(
    (spreadsheet.data.sheets ?? []).map((sheet) => sheet.properties?.title)
  );

  const toCreate = SHEETS.filter((sheet) => !existingTitles.has(sheet.name));
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map((sheet) => ({
          addSheet: { properties: { title: sheet.name } },
        })),
      },
    });
    console.log(`Created tabs: ${toCreate.map((s) => s.name).join(", ")}`);
  }

  for (const sheet of SHEETS) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheet.name}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [sheet.headers] },
    });
    console.log(`Header row set for "${sheet.name}".`);
  }

  console.log("\nDone. Remember to share this spreadsheet with:");
  console.log(`  ${clientEmail}  (Editor)`);
  console.log("and with any researcher accounts that need direct access,");
  console.log('and NOT with "Anyone with the link".');
}

main().catch((error) => {
  console.error("Spreadsheet initialization failed:", error.message ?? error);
  process.exit(1);
});
