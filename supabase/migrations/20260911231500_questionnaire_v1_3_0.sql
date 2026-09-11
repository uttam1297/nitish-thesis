-- Activates questionnaire version 1.3.0 after removing Q9 and Q18, and
-- deactivates 1.2.0. Keep the version/consent_version literals here in sync
-- with src/config/interview/index.ts (QUESTIONNAIRE_VERSION) and
-- src/config/study.ts (CONSENT_VERSION).
--
-- Idempotent: safe to re-run. Sessions already started under an earlier
-- version keep that version; only new sessions pick up 1.3.0.

update questionnaire_versions
set is_active = false
where study_id = (select id from studies where slug = 'thesis-b2c-ai-discovery')
  and version = '1.2.0';

insert into questionnaire_versions (study_id, version, consent_version, is_active)
select id, '1.3.0', '1.0.0', true
from studies
where slug = 'thesis-b2c-ai-discovery'
on conflict (study_id, version) do update set is_active = true;
