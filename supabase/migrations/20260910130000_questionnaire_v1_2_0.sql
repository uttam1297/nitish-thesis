-- Activates questionnaire version 1.2.0 (Q2 "industry" changed from free
-- text to a select-with-other question) and deactivates 1.1.0. Keep the
-- version/consent_version literals here in sync with
-- src/config/interview/index.ts (QUESTIONNAIRE_VERSION) and
-- src/config/study.ts (CONSENT_VERSION).
--
-- Idempotent: safe to re-run. Any session already started under an earlier
-- version keeps working; only new sessions pick up 1.2.0.

update questionnaire_versions
set is_active = false
where study_id = (select id from studies where slug = 'thesis-b2c-ai-discovery')
  and version = '1.1.0';

insert into questionnaire_versions (study_id, version, consent_version, is_active)
select id, '1.2.0', '1.0.0', true
from studies
where slug = 'thesis-b2c-ai-discovery'
on conflict (study_id, version) do update set is_active = true;
