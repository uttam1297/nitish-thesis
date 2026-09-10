# Data dictionary

Describes every column in the research database. Table/column definitions
live once in `supabase/migrations/` — this file documents meaning, not
structure, so if they ever disagree, the migrations are authoritative.

All timestamps are `timestamptz` (ISO 8601 on the wire). IDs are UUIDs
unless noted otherwise.

## studies

One row per study — one active row for this thesis.

| Column       | Type        | Meaning                                            |
| ------------ | ----------- | -------------------------------------------------- |
| `id`         | uuid        | Primary key.                                       |
| `slug`       | text        | Stable identifier, e.g. `thesis-b2c-ai-discovery`. |
| `title`      | text        | Matches `src/config/study.ts`.                     |
| `is_active`  | boolean     | Reserved for multi-study setups; `true` today.     |
| `created_at` | timestamptz |                                                    |

## questionnaire_versions

One row per questionnaire version. Every session and response is tied to
one via a foreign key — see README "Questionnaire versioning".

| Column            | Type        | Meaning                                                                                                     |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `id`              | uuid        | Primary key — the FK target from `sessions.questionnaire_version_id`.                                       |
| `study_id`        | uuid        | FK to `studies`.                                                                                            |
| `version`         | text        | e.g. `1.0.0`. Matches `QUESTIONNAIRE_VERSION` in `src/config/interview/index.ts` for the _current_ version. |
| `consent_version` | text        | The consent wording version this questionnaire version was collected under.                                 |
| `is_active`       | boolean     | Only one version should be active for new sessions at a time.                                               |
| `created_at`      | timestamptz |                                                                                                             |

## participants

One row per participant.

| Column                   | Type        | Example                        | Meaning / research use                                                                                                                    |
| ------------------------ | ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | uuid        |                                | Internal identifier. Never shown to the participant, never a login/resume credential. FK target for `sessions`/`responses`/`consents`.    |
| `participant_code`       | text        | `P007`                         | Research label, assigned atomically by `participant_code_seq` at insert time. Use this (not `id`) in any human-facing export or write-up. |
| `role`                   | text        | `Product / Product Management` | Q1 answer, formatted as its selected label(s).                                                                                            |
| `industry`               | text        | `Retail`                       | Q2 answer (free text).                                                                                                                    |
| `experience`             | text        | `6-10 years`                   | Q3 answer (free text).                                                                                                                    |
| `closeness_to_discovery` | text        | `4`                            | Q4 answer, a 1-5 Likert value stored as text.                                                                                             |
| `created_at`             | timestamptz |                                |                                                                                                                                           |

## sessions

One row per interview attempt.

| Column                                                              | Type                | Meaning                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                | uuid                | Primary key. FK target for `responses`/`consents`.                                                                                                                                                 |
| `participant_id`                                                    | uuid                | FK to `participants`.                                                                                                                                                                              |
| `questionnaire_version_id`                                          | uuid                | FK to `questionnaire_versions` — the source of truth for which version this session used.                                                                                                          |
| `questionnaire_version`                                             | text                | Denormalized copy of the FK'd row's `version`, so the admin UI and the resume-flow version check don't need a join.                                                                                |
| `resume_token_hash`                                                 | text                | SHA-256 hex of the resume token, unique-indexed. Never the raw token — this alone can't be used to resume a session. Not a research field; ignore for analysis.                                    |
| `response_mode`                                                     | text                | `asynchronous_form` \| `live_interview`. Keep as an analysis dimension — don't merge the two silently.                                                                                             |
| `status`                                                            | text                | `started` \| `in_progress` \| `completed` \| `withdrawn`. Only `completed` sessions normally belong in the final analytical sample; `withdrawn` sessions have had their response content scrubbed. |
| `current_question_id`                                               | text                | Operational, for resume; not a research variable.                                                                                                                                                  |
| `progress_percentage`                                               | int                 | 0-100. Useful for pilot review, not a research construct.                                                                                                                                          |
| `study_stage`                                                       | text                | `pilot` \| `main`. **Filter pilot sessions out of the final analytical sample unless explicitly decided otherwise** — see PILOT_CHECKLIST.md.                                                      |
| `client_request_id`                                                 | text or null        | Idempotency key for creation, unique-indexed. Operational only; ignore for analysis.                                                                                                               |
| `started_at` / `last_activity_at` / `completed_at` / `withdrawn_at` | timestamptz or null | `completed_at - started_at` gives an approximate completion duration — not lab-grade timing.                                                                                                       |

## responses — the canonical research dataset (long format)

One row per (session, question) pair — enforced by `UNIQUE(session_id,
question_id)`. This is the table to query for qualitative coding or
statistical analysis.

| Column                          | Type         | Meaning                                                                                                                                                                                                                                                                             |
| ------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | uuid         | Primary key; not usually needed for analysis.                                                                                                                                                                                                                                       |
| `session_id` / `participant_id` | uuid         | FKs — join back to `sessions`/`participants` for role, industry, response_mode, study_stage, etc.                                                                                                                                                                                   |
| `question_id`                   | text         | Matches `src/config/interview/*-questions.ts`, e.g. `q9`.                                                                                                                                                                                                                           |
| `question_version`              | text         | Currently a fixed constant across all questions — see README versioning notes.                                                                                                                                                                                                      |
| `construct`                     | text         | The research construct this question maps to — see `src/config/interview/taxonomy.ts`.                                                                                                                                                                                              |
| `response_type`                 | text         | One of the engine's response types (`single_select`, `multi_select`, `likert_scale`, `ranking`, `short_text`, `long_text`, `voice_or_text`, `optional_elaboration`).                                                                                                                |
| `response_value`                | jsonb        | Native JSON, not a string. Shape depends on `response_type`'s answer kind: `{kind:"choice",value}`, `{kind:"choices",values:[]}`, `{kind:"scale",value}`, `{kind:"ranking",order:[]}`, or `{kind:"text",text}`. A withdrawn response is the literal string `"[WITHDRAWN]"` instead. |
| `optional_elaboration`          | text or null | Reserved for a follow-up elaboration field; unused by the shipped question set (every question is its own row).                                                                                                                                                                     |
| `created_at` / `updated_at`     | timestamptz  | Equal values mean the participant never revisited that answer.                                                                                                                                                                                                                      |

## consents

Append-only: a session's consent history, never edited in place.

| Column                          | Type        | Meaning                                                                                                                                                      |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                            | uuid        | Primary key.                                                                                                                                                 |
| `session_id` / `participant_id` | uuid        | FKs.                                                                                                                                                         |
| `consent_version`               | text        | Which wording of the consent statements — see `CONSENT_VERSION` in `src/config/study.ts`.                                                                    |
| `participation_consent`         | boolean     | Always `true` for a row that exists — the server rejects session creation without it.                                                                        |
| `voice_input_consent`           | boolean     | Agreement to type-or-speak answers into the form. **Not** the same as `recording_consent`.                                                                   |
| `recording_consent`             | boolean     | Agreement to have a **live call recorded** — distinct from voice-input consent. For `response_mode = asynchronous_form`, normally `false` (no call happens). |
| `consented_at`                  | timestamptz |                                                                                                                                                              |
