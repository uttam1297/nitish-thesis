-- Activates questionnaire version 1.5.0 and deactivates 1.4.0.
--
-- 1.5.0 changes the question set for the first time since 1.3.0:
--   * Q11 is retired. The source question document repeated Q10's prompt
--     verbatim as Q11, so the two could never be told apart in analysis.
--   * Q16 is retired: dropped from the study.
--   * Voice input is switched off; answers are typed.
--
-- Responses already recorded for q11 and q16 are deliberately left in place.
-- They belong to sessions pinned to 1.3.0/1.4.0, where those questions were
-- genuinely asked, and deleting them would destroy collected research data.
-- The dashboard scopes every question to its questionnaire version, so they
-- simply stop appearing under 1.5.0.
--
-- Keep the version/consent_version literals here in sync with
-- src/config/interview/index.ts (QUESTIONNAIRE_VERSION) and
-- src/config/study.ts (CONSENT_VERSION).
--
-- Idempotent: safe to re-run. Sessions already started under an earlier
-- version keep that version; only new sessions pick up 1.5.0.

update questionnaire_versions
set is_active = false
where study_id = (select id from studies where slug = 'thesis-b2c-ai-discovery')
  and is_active = true;

insert into questionnaire_versions (study_id, version, consent_version, is_active)
select id, '1.5.0', '1.0.0', true
from studies
where slug = 'thesis-b2c-ai-discovery'
on conflict (study_id, version) do update set is_active = true;
