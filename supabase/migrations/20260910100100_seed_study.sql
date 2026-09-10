-- Seeds the one active study and its initial questionnaire version.
-- Idempotent: safe to re-run. Keep the slug/version/consent_version
-- literals here in sync with src/config/interview/index.ts
-- (QUESTIONNAIRE_VERSION) and src/config/study.ts (CONSENT_VERSION) — see
-- README "How to create a new questionnaire version" for what to do when
-- either changes.

insert into studies (slug, title, is_active)
values (
  'thesis-b2c-ai-discovery',
  'Developing a Framework and Roadmap for Adapting B2C Customer Acquisition to AI-Mediated Discovery',
  true
)
on conflict (slug) do nothing;

insert into questionnaire_versions (study_id, version, consent_version, is_active)
select id, '1.0.0', '1.0.0', true
from studies
where slug = 'thesis-b2c-ai-discovery'
on conflict (study_id, version) do nothing;
