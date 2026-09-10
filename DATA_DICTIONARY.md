# Data dictionary

Describes every column in the research spreadsheet. Column order and tab
names are defined once in `src/lib/google-sheets/sheet-schema.ts` — this
file documents meaning, not structure, so if they ever disagree, the code
is authoritative.

All timestamps are ISO 8601 UTC (e.g. `2026-03-05T14:30:00.000Z`). All
boolean columns store the literal strings `"true"` / `"false"`, never
`1`/`0`/blank-means-false. IDs are UUIDs unless noted otherwise.

## Participants

One row per participant.

| Column                   | Type            | Example                        | Meaning / research use                                                                                                              |
| ------------------------ | --------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `participant_id`         | UUID            | `9f2c...`                      | Internal identifier. Never shown to the participant, never used as a login/resume credential. Join key into Sessions and Responses. |
| `role`                   | string          | `Product / Product Management` | Q1 answer, formatted as its selected label(s).                                                                                      |
| `industry`               | string          | `Retail`                       | Q2 answer (free text).                                                                                                              |
| `experience`             | string          | `6-10 years`                   | Q3 answer (free text).                                                                                                              |
| `closeness_to_discovery` | string (number) | `4`                            | Q4 answer, a 1-5 Likert value as a string.                                                                                          |
| `created_at`             | ISO timestamp   |                                | When the profile was first recorded.                                                                                                |

## Sessions

One row per interview attempt (a participant who restarts from scratch
gets a new session, not a new participant row, unless they also re-answer
the profile questions, which creates a new participant too).

| Column                                                              | Type                                                     | Example | Meaning / research use                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`                                                        | UUID                                                     |         | Join key into Responses and Consent.                                                                                                                             |
| `participant_id`                                                    | UUID                                                     |         | Join key into Participants.                                                                                                                                      |
| `resume_token_hash`                                                 | SHA-256 hex                                              |         | Never the raw resume token — this alone cannot be used to resume a session. Not a research field; ignore for analysis.                                           |
| `questionnaire_version`                                             | string                                                   | `1.0.0` | The exact question wording/routing this session answered under. See "Questionnaire version safety" below before comparing across versions.                       |
| `response_mode`                                                     | `asynchronous_form` \| `live_interview`                  |         | Distinguishes self-serve web submissions from researcher-led live interviews. Keep this as an analysis dimension, don't merge the two silently.                  |
| `status`                                                            | `started` \| `in_progress` \| `completed` \| `withdrawn` |         | Only `completed` sessions should normally enter the final analytical sample; `withdrawn` sessions have had their response content scrubbed (see Responses).      |
| `current_question_id`                                               | string                                                   | `q9`    | Operational field for resume; not a research variable.                                                                                                           |
| `progress_percentage`                                               | integer 0-100                                            | `62`    | Operational; useful for pilot review ("did people abandon partway?"), not a research construct.                                                                  |
| `started_at` / `last_activity_at` / `completed_at` / `withdrawn_at` | ISO timestamp or blank                                   |         | Use `completed_at - started_at` for completion duration; treat as approximate, not lab-grade timing.                                                             |
| `client_request_id`                                                 | string or blank                                          |         | Idempotency key for session creation. Operational only; ignore for analysis.                                                                                     |
| `study_stage`                                                       | `pilot` \| `main`                                        |         | **Filter pilot sessions out of the final analytical sample unless the researcher has explicitly decided to include them** — see "Pilot data handling" in README. |

## Responses — the canonical research dataset (long format)

One row per (session, question) pair. This is the table to open for
qualitative coding or statistical analysis.

| Column                          | Type            | Example                        | Meaning / research use                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `response_id`                   | UUID            |                                | Not usually needed for analysis; unique per row.                                                                                                                                                                                                                                                                                            |
| `participant_id` / `session_id` | UUID            |                                | Join keys back to Participants/Sessions — pull in role, industry, response_mode, study_stage, etc. via these.                                                                                                                                                                                                                               |
| `question_id`                   | string          | `q9`                           | Matches `src/config/interview/*-questions.ts`.                                                                                                                                                                                                                                                                                              |
| `question_version`              | string          | `1`                            | Currently a fixed constant across all questions (see README versioning notes) — bump it in code if per-question revisions start being tracked independently.                                                                                                                                                                                |
| `construct`                     | string          | `governance`                   | The research construct this question maps to — see `src/config/interview/taxonomy.ts` for the full list and descriptions. Use this to group responses thematically.                                                                                                                                                                         |
| `response_type`                 | string          | `voice_or_text`                | One of the engine's response types (`single_select`, `multi_select`, `likert_scale`, `ranking`, `short_text`, `long_text`, `voice_or_text`, `optional_elaboration`).                                                                                                                                                                        |
| `response_value`                | JSON string     | `{"kind":"text","text":"..."}` | Always valid JSON — parse it rather than string-matching. Shape depends on `response_type`'s underlying answer kind: `{kind:"choice",value}`, `{kind:"choices",values:[]}`, `{kind:"scale",value}`, `{kind:"ranking",order:[]}`, or `{kind:"text",text}`. A withdrawn response has the literal string `"[WITHDRAWN]"` here instead of JSON. |
| `optional_elaboration`          | string or blank |                                | Reserved for a follow-up elaboration field; currently unused by the shipped question set (every question here is its own row, not an elaboration attached to another).                                                                                                                                                                      |
| `created_at` / `updated_at`     | ISO timestamp   |                                | `created_at` is the first save; `updated_at` changes on every edit. Equal values mean the participant never revisited that answer.                                                                                                                                                                                                          |

## Consent

One append-only row per session — never edited after being written, since
it is the audit trail of what was agreed to and when.

| Column                          | Type          | Example        | Meaning / research use                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consent_id`                    | UUID          |                |                                                                                                                                                                                                                                                                                        |
| `participant_id` / `session_id` | UUID          |                | Join keys.                                                                                                                                                                                                                                                                             |
| `consent_version`               | string        | `1.0.0`        | Which wording of the consent statements this row refers to — see `CONSENT_VERSION` in `src/config/study.ts`.                                                                                                                                                                           |
| `participation_consent`         | boolean       | `true`         | Always `true` for a row that exists — the server rejects a session creation without it.                                                                                                                                                                                                |
| `voice_input_consent`           | boolean       | `true`/`false` | Agreement to type-or-speak answers into the form. **Not** the same as `recording_consent` — see below.                                                                                                                                                                                 |
| `recording_consent`             | boolean       | `false`        | Agreement to have a **live call recorded**. Distinct from voice-input consent: a participant can consent to speaking answers into a text box without ever consenting to being recorded on a call. For `response_mode = asynchronous_form`, this is normally `false` (no call happens). |
| `consented_at`                  | ISO timestamp |                |                                                                                                                                                                                                                                                                                        |

## Research_Metadata

A single active-study row plus the participant-numbering counter (see
README "Participant/session identifier strategy").

| Column                    | Type          | Meaning                                                                                                                                |
| ------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `study_id`                | string        | Fixed identifier for this study.                                                                                                       |
| `study_title`             | string        | Matches `src/config/study.ts`.                                                                                                         |
| `questionnaire_version`   | string        | The _current_ version new sessions are created under — historical sessions keep their own version in `Sessions.questionnaire_version`. |
| `consent_version`         | string        | The _current_ consent wording version.                                                                                                 |
| `created_at`              | ISO timestamp |                                                                                                                                        |
| `is_active`               | boolean       | Reserved for multi-study setups; always `true` today.                                                                                  |
| `next_participant_number` | integer       | Counter for lazily-assigned `P001…` codes — see known limitations in README before treating this as a strict sequence.                 |
