# Thesis Data Dashboard

The independent, read-only research observatory for the thesis interview dataset. It lives in `dashboard/`, deploys as a separate Vercel project, and reads the same Supabase database as the participant interview application.

## Architecture

```text
Browser → Next.js Server Components → named read repositories
        → server-only Supabase client → production research tables
```

There is no browser Supabase client and no database mutation function. Repository projections deliberately exclude `sessions.resume_token_hash`, `sessions.client_request_id`, and unused optional elaboration. Internal UUIDs are used only for server-side joins.

The implemented routes are:

- `/` — collection overview, coverage, profile distributions, timeline and integrity observations;
- `/participants` and `/participants/[participantCode]` — pseudonymous participant exploration;
- `/questions` and `/questions/[questionId]` — question coverage and deterministic distributions;
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

- Main study data is the default analytical scope; pilot data is visible only through explicit filtering.
- Q1–Q4 analytics use validated `responses.response_value`, not the formatted participant mirrors.
- Q7 is not expected only when Q1 is exactly `["engineering"]`; that path expects 15 questions, while all other eligible paths expect 16.
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

The implementation baseline before documentation is commit `a284bec` on `feature/thesis-dashboard`. The release commit and production URL are recorded in the PR and final delivery report.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The test suite covers configuration, questionnaire/schema parity, repository behavior, response validation, Q7 routing, expected counts, coverage, stage filtering, withdrawal handling, URL filter validation, privacy redaction, sensitive-field exclusions, time-zone presentation and the no-mutation boundary.

## Known limitations

- Very early exits before Q1–Q4 are invisible server-side.
- Q1–Q4 remain duplicated between participant display fields and canonical response rows.
- Input method and missing-response reasons are not persisted.
- Q10 and Q11 intentionally retain identical wording as distinct IDs.
- The public dashboard has no authentication; narratives and raw JSON therefore remain disabled by default.
- The dashboard provides descriptive analytics, not qualitative thesis conclusions.
