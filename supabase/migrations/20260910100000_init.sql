-- Phase 3 (Supabase): research data schema.
--
-- Design principles (see README "Database schema"):
--   * pseudonymous participants, resume by hashed token (never by
--     participant_code, which is a research label, not a credential)
--   * every response/session is tied to a questionnaire_versions row, so
--     historical responses stay attributable to the wording participants
--     actually answered even after questions change
--   * responses are long-format with a real UNIQUE(session_id, question_id)
--     constraint — Postgres's own ON CONFLICT makes the duplicate-row class
--     of bug that plagued the Google Sheets backend structurally impossible
--   * RLS is enabled on every table with **no** anon/authenticated
--     policies at all: every read/write goes through server Route Handlers
--     using the service-role key, which bypasses RLS by design. RLS here
--     is a deny-by-default backstop, not the access path.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- studies
create table if not exists studies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------ questionnaire_versions
create table if not exists questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies (id),
  version text not null,
  consent_version text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (study_id, version)
);

-- ---------------------------------------------------------- participants
-- Sequence, not a read-increment-write on a cell (the Google Sheets
-- version's documented limitation) — nextval() is genuinely atomic under
-- concurrent inserts, so the code-level "assign lazily at completion"
-- workaround is no longer needed; participant_code is assigned at
-- creation time.
create sequence if not exists participant_code_seq;

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  participant_code text not null unique
    default ('P' || lpad(nextval('participant_code_seq')::text, 3, '0')),
  role text not null default '',
  industry text not null default '',
  experience text not null default '',
  closeness_to_discovery text not null default '',
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id),
  questionnaire_version_id uuid not null references questionnaire_versions (id),
  -- Denormalized copy of questionnaire_versions.version, so the admin UI
  -- and the resume flow's version-safety check don't need a join for
  -- what is, in practice, an immutable value once the session exists.
  questionnaire_version text not null,
  -- Only the hash is stored; the raw resume token lives only in the
  -- participant's browser. See src/lib/supabase/resume-token.ts.
  resume_token_hash text not null unique,
  response_mode text not null
    check (response_mode in ('asynchronous_form', 'live_interview')),
  status text not null default 'started'
    check (status in ('started', 'in_progress', 'completed', 'withdrawn')),
  current_question_id text not null default '',
  progress_percentage int not null default 0
    check (progress_percentage between 0 and 100),
  study_stage text not null default 'pilot'
    check (study_stage in ('pilot', 'main')),
  -- Idempotency key for session creation; a browser retry (dropped
  -- response, double-fire) reattaches to the session this identifies
  -- instead of creating a duplicate. Nullable: absence just means that one
  -- request can't be deduplicated, never a hard failure.
  client_request_id text unique,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  withdrawn_at timestamptz
);

create index if not exists sessions_participant_id_idx on sessions (participant_id);

-- -------------------------------------------------------------- responses
-- Long format, one canonical row per (session, question) — see the
-- unique constraint. First save inserts; every later edit is a real
-- Postgres UPSERT (ON CONFLICT ... DO UPDATE), not an application-level
-- row-ref/scan dance.
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id),
  participant_id uuid not null references participants (id),
  question_id text not null,
  question_version text not null default '1',
  construct text not null,
  response_type text not null check (response_type in (
    'single_select', 'multi_select', 'likert_scale', 'ranking',
    'short_text', 'long_text', 'voice_or_text', 'optional_elaboration'
  )),
  -- The serialized AnswerValue, e.g. {"kind":"text","text":"..."} — see
  -- DATA_DICTIONARY.md for the full shape per response_type.
  response_value jsonb not null,
  optional_elaboration text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists responses_session_id_idx on responses (session_id);
create index if not exists responses_question_id_idx on responses (question_id);

-- ---------------------------------------------------------------- consents
-- Append-only: a session's consent history, never edited in place. A
-- session may have more than one row only if consent was re-confirmed
-- under a new consent_version.
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id),
  participant_id uuid not null references participants (id),
  consent_version text not null,
  participation_consent boolean not null,
  -- Deliberately separate: agreeing to speak an answer into a text box is
  -- not the same as agreeing to be recorded on a live call.
  voice_input_consent boolean not null default false,
  recording_consent boolean not null default false,
  consented_at timestamptz not null default now()
);

create index if not exists consents_session_id_idx on consents (session_id);

-- ------------------------------------------------------------------- RLS
alter table studies enable row level security;
alter table questionnaire_versions enable row level security;
alter table participants enable row level security;
alter table sessions enable row level security;
alter table responses enable row level security;
alter table consents enable row level security;

-- No policies are created for anon/authenticated on purpose: RLS with zero
-- policies denies all access to those roles by default. Every application
-- read/write uses the service_role key server-side, which bypasses RLS
-- entirely regardless of policies — see README "Row Level Security".
