# Nitish thesis interview prototype

An accessible, configuration-driven guided expert research interview. It
uses the verbatim Q1-Q18 prompts from `question-set.md`, persists research
data to a private Google Sheet, and gives the researcher a minimal
password-free (Google-login) admin dashboard.

## Stack

Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, Motion, Zod, Vitest,
React Testing Library, Playwright, Google Sheets API (`googleapis`), and
Auth.js (`next-auth` v5).

## Architecture

```text
Participant browser
  → interview engine (reducer + conditional flow, unchanged since Phase 2)
    → local autosave (always) + debounced server sync (best-effort)
      → Next.js Route Handlers (/api/interview/*, /api/admin/*)
        → repositories (Participant/Session/Response/Consent/ResearchMetadata)
          → SheetsClient interface
            → Google Sheets API  →  private spreadsheet
            (or an in-memory fallback when GOOGLE_* env vars are unset)
```

The browser never talks to Google Sheets directly, and never sees the
service-account credentials or (beyond what it needs to resume its own
session) the spreadsheet's contents. Every Google-specific file lives under
`src/lib/google-sheets/` and is marked `import "server-only"`.

Question wording and Q1 options are sourced exclusively from
`question-set.md`. The duplicated wording of Q10 and Q11 is intentionally
preserved because it is present in the source file.

### What Phase 3 added on top of Phase 2

- **Server persistence.** `src/features/interview/use-server-sync.ts` layers
  debounced, batched server sync on top of the untouched Phase 2 interview
  engine. Local autosave (`DraftStorage`) remains the source of truth; a
  failed server sync never touches it, and typing is never blocked on a
  network call.
- **Google Sheets as the research data store.** See "Spreadsheet structure"
  below. Five tabs, long-format responses, questionnaire/question
  versioning kept on every row.
- **Secure cross-device resume.** A random resume token (never the
  participant code) is the only way to reattach to a session — see "Resume
  token strategy".
- **Idempotent submission.** Retrying a submit can never create a second
  completed session — see `SessionRepository.markCompleted`.
- **Researcher admin area** (`/admin`) gated by Google sign-in restricted to
  an explicit allowlist, plus a minimal live-interview workflow.

## Spreadsheet structure

Five tabs (`src/lib/google-sheets/sheet-schema.ts` is the single source of
truth for names and headers):

| Tab                 | One row per                                | Notes                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Participants`      | participant                                | `participant_id` is an internal UUID, never a guessable sequence. Adapted to what this study's profile layer (Q1-Q4) actually collects: `role, industry, experience, closeness_to_discovery`.                             |
| `Sessions`          | interview session                          | `resume_token_hash` (never the raw token), `questionnaire_version`, `response_mode` (`asynchronous_form` \| `live_interview`), `status` (`started` \| `in_progress` \| `completed` \| `withdrawn`), progress, timestamps. |
| `Responses`         | (session, question) pair — **long format** | `question_id`, `question_version`, `construct`, `response_type`, `response_value` (JSON-serialized answer), `optional_elaboration`, timestamps. This is the analysis-ready sheet — see "Inspecting research responses".   |
| `Consent`           | consent event                              | `participation_consent`, `voice_input_consent`, `recording_consent` are independent booleans — agreeing to type/speak an answer is not the same as agreeing to call recording.                                            |
| `Research_Metadata` | the one active study                       | Also holds `next_participant_number`, the lazily-allocated sequential counter for human-readable `P001…` codes (see below).                                                                                               |

### Participant/session identifier strategy

- `participant_id` / `session_id` are server-generated UUIDs.
- A human-readable `P001` style code is **not** assigned at creation time.
  The brief explicitly warns against "read last row, +1" under concurrent
  writes; this app sidesteps that by keying everything on UUIDs and only
  ever needing the sequential code for readability in exports. If you want
  it assigned automatically at completion, call
  `ResearchMetadataRepository.allocateParticipantNumber()` from wherever you
  finalize a session — it isn't wired into the automatic flow today, so
  read the "known limitations" note below before relying on it for anything
  that must never collide.
- The participant code is **never** a login/resume credential.

### Resume-token strategy

- On session creation, the server generates a 32-byte random token
  (`generateResumeToken`), gives the raw token to the browser (as an
  httpOnly cookie _and_ embedded in a `/interview/resume?token=…` link so it
  can be copied to another device), and stores only its SHA-256 hash in
  `Sessions.resume_token_hash`.
- Resuming hashes the supplied token and looks it up with a constant-time
  comparison (`resumeTokenHashesMatch`) against a **bounded scan of the
  small Sessions sheet** — the only place this app reads a whole sheet on a
  path a participant can trigger, and only once per resume, not per save.
- Every subsequent sync/submit call re-verifies ownership with one cheap
  single-row read (`verifySessionOwnership`) instead of scanning anything.

### Write strategy (why saves don't duplicate rows or scan the sheet)

- **First save of a question:** append a row, hand the browser back the row
  number (`rowRef`).
- **Every later edit of that question:** the browser sends the same
  `rowRef` back; the server re-reads that one row, confirms it still
  belongs to the claimed session, and overwrites it in place. A stale or
  tampered `rowRef` is never trusted — it falls back to appending a fresh
  row instead of overwriting someone else's.
- Sessions/Participants/Consent are one row each, the same append-once /
  update-by-known-row pattern.
- Several changed answers are sent in one batched request
  (`ResponseRepository.upsertMany`), which itself issues at most one
  `values.batchUpdate` and one `values.append` call to the Sheets API,
  regardless of how many answers changed.

### Autosave / batching policy

- Local autosave: unchanged from Phase 2, fires on every state change.
- Server sync: debounced ~1.2s after the last change, and also forced right
  before a final submit (so clicking "Finish" the instant you land on
  Review still creates the session/response rows first). Never fires on
  every keystroke.
- On a failed sync: the UI shows "Saved on this device · retrying", the
  local draft is untouched, and a background retry runs every ~8s until it
  succeeds.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. Summary:

| Variable                                                                                  | Purpose                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID` | Service-account credentials + target spreadsheet (server-only). Omit all four locally and the app uses an in-memory Sheets client instead — handy for `npm run dev`, but data is lost on restart. |
| `AUTH_SECRET`                                                                             | Auth.js session signing secret. Generate with `openssl rand -base64 32`.                                                                                                                          |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                                                    | A _separate_ OAuth 2.0 Web Application client (not the service account) used for researcher Google sign-in.                                                                                       |
| `ADMIN_ALLOWED_EMAILS`                                                                    | Comma-separated researcher emails allowed into `/admin`.                                                                                                                                          |
| `ALLOW_ADMIN_TEST_LOGIN`, `E2E_ADMIN_TEST_SECRET`                                         | **Test/CI only.** Together they enable a Credentials-provider bypass so Playwright can sign in without a live Google consent screen. Never set these on a real deployment.                        |

`GOOGLE_PRIVATE_KEY` newline handling: paste it with escaped `\n` (how
Vercel's env var UI stores multi-line values) or with real line breaks
inside the quotes — `readGoogleSheetsCredentials()` un-escapes `\n`
automatically either way.

## Google Cloud project setup

1. Create (or reuse) a Google Cloud project.
2. **Enable the Google Sheets API** for that project (APIs & Services →
   Enable APIs → search "Google Sheets API").
3. **Create a service account** (APIs & Services → Credentials → Create
   Credentials → Service account). Give it no special project roles — it
   only needs access to the one spreadsheet you share with it.
4. Create a JSON key for that service account and copy `client_email`,
   `private_key`, and the project id into your env vars. **Never commit
   this JSON file.**
5. **Create a separate OAuth 2.0 Client ID** (Web application) for
   researcher sign-in — this is what `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`
   come from. Add your deployed URL's `/api/auth/callback/google` as an
   authorized redirect URI (and `http://localhost:3000/api/auth/callback/google`
   for local dev).
6. Create a new Google Sheet, note its id from the URL
   (`https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`), and put it
   in `GOOGLE_SPREADSHEET_ID`.
7. **Share the spreadsheet with the service account's email** (Editor
   access) and with any researcher accounts that need to open it directly
   in Google Sheets. Do **not** set link sharing to "Anyone with the link".
8. Run the initializer script to create the tabs and headers:

   ```bash
   GOOGLE_PROJECT_ID=... GOOGLE_CLIENT_EMAIL=... GOOGLE_PRIVATE_KEY=... \
   GOOGLE_SPREADSHEET_ID=... npm run sheets:init
   ```

   Safe to re-run — it only creates missing tabs and rewrites header rows.

## Local development setup

```bash
npm install
cp .env.example .env.local   # fill in real values, or leave GOOGLE_* unset
npm run dev
```

With `GOOGLE_*` unset, the app logs a warning and uses an in-memory Sheets
client (`InMemorySheetsClient`) — the whole participant + admin flow works,
but data resets on restart. Set `AUTH_SECRET` even in this mode; Auth.js
needs it.

Open <http://localhost:3000/interview> for the participant flow and
<http://localhost:3000/admin> for the researcher dashboard.

## Vercel deployment setup

1. Set all the environment variables from ".env.example" in the Vercel
   project settings (Production and Preview as appropriate).
2. `GOOGLE_PRIVATE_KEY`: paste with `\n` escapes — Vercel's UI does not
   accept literal newlines in a single-line value.
3. Do **not** set `ALLOW_ADMIN_TEST_LOGIN` on a real deployment.
4. Add the deployed domain's `/api/auth/callback/google` to the OAuth
   client's authorized redirect URIs.
5. `AUTH_TRUST_HOST` is not needed on Vercel (it sets the host correctly
   itself); it's only needed for arbitrary local/CI hosts — see
   `playwright.config.ts`.

## How to inspect research responses

Open the spreadsheet directly (Google Sheets already has strong filtering,
pivot tables, and export to CSV/Excel — this app deliberately does not
duplicate that). The `Responses` tab is long-format and analysis-ready as
it stands:

```text
participant_id, session_id, question_id, question_version, construct,
response_type, response_value (JSON), optional_elaboration, created_at, updated_at
```

For the researcher-facing view of one session (profile, consent, responses
grouped by construct), use `/admin/sessions/<sessionId>` — reachable from
the `/admin` overview's session table.

## How to create a new questionnaire version

Question wording must never silently change under participants who already
answered. To make a change:

1. Edit the question content in `src/config/interview/` as normal.
2. Bump `QUESTIONNAIRE_VERSION` in `src/config/interview/index.ts`.
3. Every new session/response records the new version; historical rows keep
   the version participants actually saw (`Sessions.questionnaire_version`,
   `Responses.question_version`). Nothing rewrites old rows.
4. A saved draft or resume link from an older version is detected and
   blocked from auto-resuming (see `resume-client.tsx`) rather than being
   silently replayed against the new question set.

`question_version` per-question is currently a fixed `"1"` constant (see
`QUESTION_VERSION` in `use-server-sync.ts`) — bump it there too if you start
tracking per-question revisions independently of the whole questionnaire.

## How to record a live interview

1. Sign in to `/admin` and click "Start live interview".
2. Fill in the participant's profile as you introduce the study verbally,
   and confirm whether they consented to call recording.
3. Click "Create live session" and open the resulting resume link in the
   browser you'll use for the interview (screen-share it, or use a second
   device) — it drops straight into the same participant-facing engine,
   tagged `response_mode = "live_interview"` in the Sessions/Responses
   sheets so it stays analytically distinguishable from self-serve
   submissions without losing any of the shared schema.

## How to withdraw/delete a participant

From `/admin/sessions/<sessionId>`, click "Withdraw participant" (admin-only
— there is no public delete endpoint of any kind). This is deliberate and
auditable:

- The session is marked `status = "withdrawn"` (not deleted), so its row
  number stays stable for anything else that referenced it mid-request.
- Every response row for that session has its `response_value` overwritten
  to `"[WITHDRAWN]"` and its `optional_elaboration` cleared.
- The `Consent` row is left alone — it's the audit trail of what was agreed
  to and when, not personal research content, and may itself be evidence
  the withdrawal process needs.
- The action is logged server-side (session id, admin email, rows
  scrubbed) — see the `console.info("[admin] session withdrawn", …)` call
  in `withdraw/route.ts`.

## How to rotate service-account credentials

1. In Google Cloud Console, create a new key for the same service account.
2. Update `GOOGLE_PRIVATE_KEY` (and `GOOGLE_CLIENT_EMAIL` if you also
   rotated the account itself) in your deployment's environment variables.
3. Redeploy.
4. Delete the old key from Google Cloud Console once the new deployment is
   confirmed working. The spreadsheet's sharing settings do not need to
   change unless you rotated the service account's email address itself.

## Known limitations of using Google Sheets here

- **No real transactions.** `ResearchMetadataRepository.allocateParticipantNumber`
  is a read-increment-write on one cell — safe enough at thesis scale, but
  not a real atomic counter under true concurrent writes. Flagged, not
  solved; this is exactly the kind of thing the brief says to flag rather
  than trying to recreate PostgreSQL inside Sheets.
- **No joins.** The admin dashboard reads the (small) Participants and
  Sessions sheets in full and joins them in memory. Fine at this scale;
  would not be fine at thousands of rows.
- **API quotas.** Google Sheets' default quota (roughly 60 write requests
  per minute per user) is not something this app actively guards against
  beyond batching — a real burst of simultaneous participants could hit it.
- **Row-ref trust boundary.** The response write path trusts a
  browser-supplied row number after one verification read. That's a
  deliberate, documented trade-off to avoid scanning the whole sheet on
  every keystroke-adjacent save, not an oversight.
- **In-memory fallback is single-process.** It now lives on `globalThis` so
  it's consistent across every route within one server process (the
  original module-level version looked like it "forgot" data between
  routes on some bundlers) — but it still does not survive a restart or
  span multiple server instances. Set real `GOOGLE_*` credentials for
  anything that matters.

## Commands

```bash
npm install
npm run dev
npm run sheets:init      # one-time (and re-runnable) spreadsheet setup
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Open <http://localhost:3000/interview> during local development, and
<http://localhost:3000/admin> for the researcher dashboard.

## Not implemented (by design, this phase)

Participant-facing generative AI, AI summarisation, automatic thematic
coding, LLM analysis, raw audio storage, complex BI dashboards, and
migration to another database provider — all explicitly out of scope for
this phase.
