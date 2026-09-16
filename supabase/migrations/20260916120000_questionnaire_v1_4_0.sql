-- Questionnaire 1.4.0 retains the exact 1.3.0 question wording and routing,
-- and adds a structured "not applicable to my experience" response option
-- to narrative questions Q5-Q17. Existing sessions remain pinned to 1.3.0.

update questionnaire_versions
set is_active = false
where study_id = (select id from studies where slug = 'thesis-b2c-ai-discovery')
  and is_active = true;

insert into questionnaire_versions (study_id, version, consent_version, is_active)
select id, '1.4.0', '1.0.0', true
from studies
where slug = 'thesis-b2c-ai-discovery'
on conflict (study_id, version) do update set is_active = true;
