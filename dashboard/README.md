# Thesis Data Dashboard

The independent, read-only research observatory for the thesis interview dataset. It lives in `dashboard/`, deploys as a separate Vercel project, and reads the same Supabase database as the participant interview application.

## Architecture

```text
Browser → Next.js Server Components → named read repositories
        → server-only Supabase client → production research tables
```

There is no browser Supabase client and no database mutation function. Repository projections deliberately exclude `sessions.resume_token_hash`, `sessions.client_request_id`, and unused optional elaboration. Internal UUIDs are used only for server-side joins.

The implemented routes are:

- `/` — headline dataset metrics, a cumulative collection trajectory, participant composition, per-question and per-participant completion, and integrity observations;
- `/participants` and `/participants/[participantCode]` — pseudonymous participant exploration;
- `/questions` and `/questions/[questionId]` — per-question completion and deterministic distributions, merged across questionnaire versions;
- `/responses` — privacy-redacted long-format response explorer;
- `/data-structure` — live row counts plus the static schema catalogue.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required server-only values:

```text
DASHBOARD_SUPABASE_URL
DASHBOARD_SUPABASE_SERVICE_ROLE_KEY
```

Behaviour defaults:

```text
DASHBOARD_REVALIDATE_SECONDS=1800
DASHBOARD_SHOW_NARRATIVES=false
DASHBOARD_SHOW_RAW_JSON=false
DASHBOARD_TIMEZONE=Europe/Berlin
```

Never commit `.env.local`. The service-role credential bypasses RLS and must never use a `NEXT_PUBLIC_` name.

## Research and privacy rules

- Every stored session is presented as one dataset. Study stage, questionnaire version and collection mode are still read from Supabase and still drive per-session question mapping, but they are not visitor-facing filters: they are research-system metadata, not something a reader should have to understand.
- Questions are merged across questionnaire versions for display. Internally a question exists once per version, because wording stays pinned to what each participant actually saw; the merged row shows the newest wording and sums the counts.
- A question the current questionnaire no longer asks is labelled **Retired** rather than hidden. Answers already collected for it are real data, and its denominator counts only the participants who were actually asked it.
- Q1–Q4 analytics use validated `responses.response_value`, not the formatted participant mirrors.
- Q7 is not expected only when Q1 is exactly `["engineering"]`. Expected counts follow the questionnaire the session is pinned to, so they differ by version: under 1.5.0 that is 13 questions for the engineering-only path and 14 otherwise.
- Withdrawn sessions remain audit records but do not contribute response content or normal coverage denominators.
- Narrative answers and raw JSON are absent from browser output by default. Enabling raw JSON does not override the narrative switch.
- Participant codes are pseudonymous, not anonymous identities.
- Analytics are deterministic and descriptive. The application performs no AI, sentiment, thematic, or thesis-conclusion generation.

## Deployment

Vercel project: `nitish-thesis-dashboard`

- Git repository: `uttam1297/nitish-thesis`
- Root Directory: `dashboard`
- Production Branch: `main`
- Preview and Production variables are configured separately from the interview project.

The release commit and production URL are recorded in the PR and final delivery report.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The test suite covers configuration, questionnaire/schema parity, repository behavior, response validation, Q7 routing, expected counts, completion arithmetic, cross-version question merging, question retirement, collection-trajectory and ordered-distribution analytics, withdrawal handling, URL filter validation (including that a crafted URL cannot reintroduce a removed scope), privacy redaction, sensitive-field exclusions, time-zone presentation and the no-mutation boundary.

## Charts

Charts are server-rendered SVG and CSS: no chart library, no client JavaScript, and no hydration cost. Every chart states its numbers in text beside the shape, so it stays readable without colour vision, and points carry a `<title>` for hover detail.

Chart types follow the data rather than decoration. Cumulative totals over time use a line; categorical and ordinal breakdowns use bars, with experience and the 1-5 discovery scale ordered along their own axis rather than by size. There is deliberately no scatter plot (the dataset has no pair of continuous variables), no pie chart (multi-select roles do not sum to a whole) and no heatmap.

## Known limitations

- Very early exits before Q1–Q4 are invisible server-side.
- Q1–Q4 remain duplicated between participant display fields and canonical response rows.
- Input method and missing-response reasons are not persisted.
- Q10 and Q11 shared identical wording as distinct IDs; Q11 and Q16 were retired in questionnaire 1.5.0, and their existing answers are retained.
- The public dashboard has no authentication; narratives and raw JSON therefore remain disabled by default.
- The dashboard provides descriptive analytics, not qualitative thesis conclusions.
