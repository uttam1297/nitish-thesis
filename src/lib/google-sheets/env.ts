import "server-only";

/**
 * Server-only Google credentials. Never import this module (or anything
 * that imports it) from a Client Component — the `server-only` guard above
 * throws at build time if that happens.
 */
export interface GoogleSheetsCredentials {
  projectId: string;
  clientEmail: string;
  /** Already un-escaped: real newlines, ready for `google-auth-library`. */
  privateKey: string;
  spreadsheetId: string;
}

/**
 * Vercel (and most CI) environment variable UIs cannot store a literal
 * newline, so `GOOGLE_PRIVATE_KEY` is usually set with escaped `\n`
 * sequences. Convert those back to real newlines; a key that already has
 * real newlines (e.g. from a local `.env` heredoc) is left untouched.
 *
 * Also tolerates two common paste mistakes that both produce the same
 * opaque `ERR_OSSL_UNSUPPORTED` / "DECODER routines::unsupported" error
 * from Node, with no hint as to the actual cause:
 *
 * 1. Copying the value straight out of the downloaded JSON key file,
 *    including its surrounding double quotes.
 * 2. An env-var UI that flattens a multi-line paste to one line and drops
 *    every newline entirely — no real newlines *and* no literal `\n` left
 *    for step 1 above to convert. Detected by the BEGIN/END PEM markers
 *    still being present with nothing but base64 between them, and fixed
 *    by reinserting the line breaks.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  key = key.trim();

  if (!key.includes("\n")) {
    const match = key.match(/-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----/);
    if (match) {
      const [, label, body] = match;
      key = `-----BEGIN ${label}-----\n${body.trim()}\n-----END ${label}-----\n`;
    }
  }

  return key;
}

/**
 * Reads and validates Google credentials from the environment. Returns
 * `null` (rather than throwing) when they are absent, so local development
 * and tests can fall back to the in-memory Sheets client without every
 * caller having to catch a startup exception.
 */
export function readGoogleSheetsCredentials(): GoogleSheetsCredentials | null {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!projectId || !clientEmail || !privateKey || !spreadsheetId) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
    spreadsheetId,
  };
}
