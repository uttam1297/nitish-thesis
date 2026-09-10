# Nitish thesis interview prototype

An accessible, configuration-driven guided expert research interview. It
uses the verbatim Q1-Q18 prompts from `question-set.md`, persists research
data to Supabase (PostgreSQL), and gives the researcher a minimal
Supabase-Auth-gated admin dashboard.

## Stack

Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, Motion, Zod, Vitest,
React Testing Library, Playwright, Supabase (`@supabase/supabase-js`,
`@supabase/ssr`).

## Architecture

```text
Participant browser
  → interview engine (reducer + conditional flow — unchanged since Phase 2)
    → local autosave (always) + debounced server sync (best-effort)
      → Next.js Route Handlers (/api/interview/*, /api/admin/*)
        → repositories (Participant/Session/Response/Consent/Study)
          → Supabase service-role client
            → PostgreSQL (Row Level Security enabled, no anon policies)
            (or an in-memory fallback when SUPABASE_* env vars are unset)
```

The browser never talks to the database directly. The service-role key
(which bypasses Row Level Security entirely) lives only in
`src/lib/supabase/server-client.ts` and is never sent to the browser.
Every Supabase-specific server file lives under `src/lib/supabase/` and is
marked `import "server-only"`.

Question wording and Q1 options are sourced exclusively from
`question-set.md`. The duplicated wording of Q10 and Q11 is intentionally
preserved because it is present in the source file.

### Why Supabase instead of Google Sheets

An earlier iteration used Google Sheets as the backend. It was replaced
because Sheets has no real transactions, no native upsert, and the Google
service-account credential (a PEM private key) proved to be a persistent,
hard-to-debug source of production breakage (malformed keys, env-var UIs
mangling newlines). PostgreSQL gives this app for free what Sheets needed
extensive hand-rolled code to approximate:

- **Duplicate-row prevention** — `UNIQUE(session_id, question_id)` plus a
  real `ON CONFLICT ... DO UPDATE` upsert, instead of an application-level
  row-ref cache and a fallback table scan.
- **Idempotent session creation** — a `UNIQUE(client_request_id)`
  constraint plus one `on unique_violation` branch, instead of a bounded
  sheet scan.
- **Atomic participant numbering** — a real Postgres sequence
  (`nextval()`), instead of a documented read-increment-write race.
- **Indexed resume-token lookup** — `WHERE resume_token_hash = $1` against
  a unique index, instead of scanning every row.

## Database schema

Defined as SQL migrations under `supabase/migrations/` — schema-as-code,
reproducible from the repository, never hand-created in the Supabase
dashboard. See `DATA_DICTIONARY.md` for every column's meaning.

| Table                    | One row per                                | Notes                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `studies`                | a study                                    | One active row for this thesis.                                                                                                                                                                             |
| `questionnaire_versions` | a questionnaire version                    | Every session/response is tied to one; never mutated once responses exist against it — see "Questionnaire versioning" below.                                                                                |
| `participants`           | participant                                | `id` is an internal UUID, never a guessable sequence. `participant_code` (`P001`…) is assigned atomically by a Postgres sequence at insert time.                                                            |
| `sessions`               | interview session                          | `resume_token_hash` (never the raw token, unique-indexed), `response_mode` (`asynchronous_form` \| `live_interview`), `status`, `study_stage`, `client_request_id` (idempotency key), progress, timestamps. |
| `responses`              | (session, question) pair — **long format** | `UNIQUE(session_id, question_id)` — the canonical-row guarantee. `response_value` is native `jsonb`.                                                                                                        |
| `consents`               | consent event                              | `participation_consent`, `voice_input_consent`, `recording_consent` are independent booleans — agreeing to type/speak an answer is not the same as agreeing to call recording.                              |

### Participant/session identifier strategy

- `participants.id` / `sessions.id` are server-generated UUIDs — never
  exposed as a resume credential.
- `participant_code` (`P001`, `P002`, …) is a research label for
  readability in exports, assigned atomically at creation via
  `participant_code_seq`. It is **never** accepted as a login/resume
  credential — see "Resume-token strategy".

### Resume-token strategy

- On session creation, the server generates a 32-byte random token
  (`generateResumeToken`), gives the raw token to the browser (as an
  httpOnly cookie _and_ embedded in a `/interview/resume?token=…` link so
  it can be copied to another device), and stores only its SHA-256 hash in
  `sessions.resume_token_hash` (unique-indexed).
- Resuming hashes the supplied token and looks it up with one indexed
  query plus a constant-time comparison (`resumeTokenHashesMatch`).
- Every subsequent sync/submit call re-verifies ownership the same way —
  one indexed row lookup, never a table scan.

### Write strategy

- **First save of a question:** a Postgres upsert inserts the row.
- **Every later edit of that question:** the same upsert call, keyed by
  `(session_id, question_id)`, updates it — `ON CONFLICT ... DO UPDATE`.
  There is no row-ref to track client-side and nothing to fall back to
  scanning for.
- Several changed answers are sent and upserted in one batched call
  (`ResponseRepository.upsertMany`) — one round trip regardless of how
  many answers changed.

### Autosave / batching policy

- Local autosave: fires on every state change, independent of the network.
- Server sync: debounced ~1.2s after the last change, and also forced
  right before a final submit (so clicking "Finish" the instant you land
  on Review still creates the session/response rows first). Never fires
  on every keystroke.
- On a failed sync: the UI shows "Saved on this device · retrying", the
  local draft is untouched, and a background retry runs every ~8s until
  it succeeds.

### Idempotency

- **Session creation** — a client-generated `clientRequestId` (persisted
  to `localStorage` before the request fires, so it survives a closed
  tab) lets the server recognize a retry via the `client_request_id`
  unique constraint and reattach to the original session (issuing a
  fresh resume token) instead of creating a duplicate participant/
  session/consent row set.
- **Response saves** — the `UNIQUE(session_id, question_id)` upsert makes
  a duplicate row structurally impossible, retry or not.
- **Final submission** — `SessionRepository.markCompleted` only
  transitions a session whose status isn't already `"completed"` (an
  atomic conditional update), so a retried submit can never create a
  second completed session.
- **Withdrawal** — re-running it on an already-withdrawn session is safe
  (it re-scrubs the same rows to the same `"[WITHDRAWN]"` value).

### Resume conflict strategy

**Rule: per question, whichever copy has the newer `updatedAt` wins** —
implemented in `mergeResponsesByRecency`
(`src/features/interview/resume-merge.ts`) and used by the resume-by-link
flow. Opening a resume link for a session this browser already has local
progress for (e.g. an old link opened again after edits that never
reached the server) merges answer-by-answer rather than letting the
server response blindly clobber unsynced local text.

### Multi-tab safety

The same session opened in two tabs is handled minimally: a `storage`
event for the local draft key fires in every tab that did _not_ make the
write, so any such event means another tab has saved progress. The
affected tab shows a banner with a "Reload this tab" action — no
real-time merge, this is a thesis form, not a collaborative document
editor.

## Voice experience

Voice is implemented via the browser's native Web Speech API
(`SpeechRecognition`/`webkitSpeechRecognition`), behind a
`VoiceTranscriptionAdapter` interface (`src/features/voice/`). This
application does **not** control where that recognition actually runs:
depending on the browser and OS, it may process audio on-device or send it
to the browser/OS vendor's own servers — the participant-facing copy
discloses this rather than claiming otherwise. The application never
receives or stores raw audio — only the transcript the participant sees,
can edit, and explicitly keeps by continuing. Typing is always available
regardless of voice support, and voice failure never blocks completion.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values.

| Variable                                                    | Purpose                                                                                                                                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public — safe in the browser bundle. RLS denies these roles everything (see the migration), so this key alone can't read or write research data. Used for the admin login form and session cookie refresh. |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Server-only secret. Bypasses RLS entirely. Omit locally and the app uses an in-memory repository instead — handy for `npm run dev`, but data is lost on restart.                                           |
| `STUDY_STAGE`                                               | `"main"` marks new sessions as real data; anything else (including unset) defaults to `"pilot"`. See `PILOT_CHECKLIST.md`. Server-derived only — never trust this from the client.                         |
| `ADMIN_ALLOWED_EMAILS`                                      | Optional extra allowlist for `/admin`, in addition to requiring a valid Supabase Auth session.                                                                                                             |

## Supabase project setup

1. Create a Supabase project (or use the existing one).
2. **Run the migrations** against it — either via the Supabase CLI:

   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

   or by pasting the contents of each file under `supabase/migrations/`
   (in filename order) into the Supabase dashboard's SQL Editor and
   running them. Both migrations are idempotent — safe to re-run.

3. **Disable public sign-up** for this project (Authentication -> Sign In
   / Providers -> Email -> disable "Allow new users to sign up") so the
   only way into `/admin` is an account you create yourself.
4. **Create the one researcher account**: Authentication -> Users -> Add
   user, with an email and password. This is what you sign in with at
   `/admin/login`.
5. Copy the project URL and anon/publishable key (Project Settings ->
   API) into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   and the service_role key into `SUPABASE_SERVICE_ROLE_KEY`.

## Local development setup

```bash
npm install
cp .env.example .env.local   # fill in real values, or leave SUPABASE_SERVICE_ROLE_KEY unset
npm run dev
```

With `SUPABASE_SERVICE_ROLE_KEY` unset, the app logs a warning and uses an
in-memory repository (`src/lib/supabase/in-memory-db.ts`) — the whole
participant flow works, but data resets on restart. The admin **login**
form still needs `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
set, because Supabase Auth is an external service the in-memory fallback
can't stand in for.

Open <http://localhost:3000/interview> for the participant flow and
<http://localhost:3000/admin> for the researcher dashboard.

## Testing the admin area

Unit tests exercise the repository layer entirely through the in-memory
fallback (`src/tests/supabase/repositories.test.ts`) — they never touch a
real database. Automated E2E coverage of `/admin` (`flow-d-admin.spec.ts`,
`flow-e-live-interview.spec.ts`) requires a **real** Supabase Auth user,
since Auth is an external service:

```bash
E2E_SUPABASE_TEST_EMAIL=researcher-test@example.com \
E2E_SUPABASE_TEST_PASSWORD=... \
npm run test:e2e
```

Create that user the same way as the real researcher account (step 4
above) — ideally a dedicated test account, not the real one. Both admin
E2E specs skip themselves (rather than failing) when these env vars are
unset.

## Vercel deployment setup

1. Set all the environment variables from `.env.example` in the Vercel
   project settings (Production and Preview as appropriate).
2. Redeploy after adding/changing env vars — Vercel does not apply
   changes to an already-running deployment.

## Data dictionary

`DATA_DICTIONARY.md` documents every column in every table: type, meaning,
example, and research use.

## How to inspect research responses

Query the database directly (Supabase's Table Editor, or `psql`/any SQL
client) — this app deliberately does not duplicate Supabase's own tooling.
The `responses` table is long-format and analysis-ready as it stands. For
the researcher-facing view of one session (profile, consent, responses
grouped by construct), use `/admin/sessions/<sessionId>`.

## Export

`/admin` links to three admin-only export endpoints:

- **CSV** (`/api/admin/export/csv`) — flat, structured: participant code,
  role, industry, response mode, question, construct, response type,
  response, questionnaire version, timestamp.
- **Qualitative CSV** (`/api/admin/export/qualitative`) — minimal
  columns for coding software: Participant, Construct, Question,
  Response, Collection mode.
- **JSON** (`/api/admin/export/json`) — full structure, sessions nested
  with participant/consent/responses, preserving arrays (ranking order,
  multi-select values) a flat CSV would lose.

All three are derived from the same canonical tables at request time
(`src/lib/supabase/export-data.ts`) — never a separately-maintained copy
that could drift out of sync.

## How to create a new questionnaire version

Question wording must never silently change under participants who
already answered:

1. Edit the question content in `src/config/interview/` as normal.
2. Bump `QUESTIONNAIRE_VERSION` in `src/config/interview/index.ts`.
3. Insert a new `questionnaire_versions` row for the new version (a
   migration, or directly via SQL) and mark the old one `is_active =
false`.
4. Every new session records the new version (`sessions.questionnaire_version`,
   denormalized alongside the FK for easy display/filtering); historical
   sessions keep the version their participants actually saw. Nothing
   rewrites old rows.
5. A resume link from an older version is detected and blocked from
   auto-resuming (`resume-client.tsx`) rather than silently replayed
   against the new question set.

`question_version` per-question is currently a fixed `"1"` constant (see
`QUESTION_VERSION` in `use-server-sync.ts`) — bump it there if you start
tracking per-question revisions independently of the whole questionnaire.

## How to record a live interview

1. Sign in to `/admin` and click "Start live interview".
2. Fill in the participant's profile as you introduce the study verbally,
   and confirm whether they consented to call recording.
3. Click "Create live session" and open the resulting resume link in the
   browser you'll use for the interview — it drops straight into the same
   participant-facing engine, tagged `response_mode = "live_interview"`
   so it stays analytically distinguishable from self-serve submissions
   without losing any of the shared schema.

## How to withdraw/delete a participant

From `/admin/sessions/<sessionId>`, click "Withdraw participant"
(admin-only — there is no public delete endpoint). This is deliberate and
auditable:

- The session is marked `status = "withdrawn"` (not deleted).
- Every response row for that session has its `response_value`
  overwritten to `"[WITHDRAWN]"` and `optional_elaboration` cleared.
- The `consents` row is left alone — it is the audit trail of what was
  agreed to and when, not personal research content, and may itself be
  evidence the withdrawal process needs.
- The action is logged server-side (session id, admin email, rows
  scrubbed).

## Row Level Security

Every table has RLS enabled with **zero policies** for the `anon`/
`authenticated` roles — this denies them all access by default. All
application reads/writes go through Route Handlers using the
`service_role` key, which bypasses RLS by design regardless of policies.
To verify: query any table using the anon/publishable key (e.g. via
`supabase-js` with `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or the Supabase
dashboard's "Run as" role switcher) and confirm it returns zero rows and
no error leaking schema details.

## Researcher authentication

Supabase Auth, email + password, for the one researcher account. Public
sign-up must be disabled in the Supabase project (see "Supabase project
setup") so a successful sign-in already implies "is the researcher" — any
authenticated user is trusted unless `ADMIN_ALLOWED_EMAILS` is also set
for an extra allowlist. `src/proxy.ts` gates `/admin/**` on a session
cookie (optimistic check, also refreshes the session); every admin Route
Handler and page re-verifies the session itself
(`src/lib/supabase/admin-guard.ts`) before touching research data.

## Known limitations

- **Full-table reads for admin/export views.** The admin dashboard and
  export routes read `sessions`/`participants`/`responses` in full and
  join in memory. Fine at thesis scale; would need real pagination and
  server-side filtering at a much larger size.
- **In-memory fallback is single-process.** Lives on `globalThis` so it's
  consistent across routes within one server process, but does not
  survive a restart or span multiple server instances. Set real
  `SUPABASE_*` credentials for anything that matters.
- **No real-time collaboration.** Multi-tab safety is a warning banner,
  not a merge — see "Multi-tab safety" above.

## Commands

```bash
npm install
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Open <http://localhost:3000/interview> during local development, and
<http://localhost:3000/admin> for the researcher dashboard.

## Not implemented (by design)

Participant-facing generative AI, AI summarisation, automatic thematic
coding, LLM analysis, raw audio storage, elaborate BI dashboards,
third-party analytics/tracking, and any database provider other than
Supabase/PostgreSQL — all explicitly out of scope.
