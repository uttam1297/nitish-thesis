# Pilot review checklist

For a pilot with roughly 2-3 participants, before the questionnaire is
treated as final. Answer each item from the pilot sessions in the
database (`sessions`, `responses` tables — Supabase Table Editor or any
SQL client) and, where useful, a short follow-up conversation with each
pilot participant.

Every session created during the pilot is automatically tagged
`study_stage = 'pilot'` in `sessions` (see `DATA_DICTIONARY.md`). Keep
pilot responses out of the final analytical sample unless you make an
explicit, documented decision to include them — see "After the pilot"
below.

## Checklist

1. Did participants understand consent?
2. Did they understand what the research was about?
3. Was the estimated completion time accurate? _(This build does not show
   a time estimate to participants — see README "Section transitions" —
   so judge this from actual `completed_at - started_at` durations in
   `sessions` instead.)_
4. Were any questions confusing?
5. Were any questions repetitive? _(Q10/Q11 are intentionally identical —
   see README — don't flag that pair unless participants found it
   confusing rather than just repetitive.)_
6. Did MCQ options cover participants' situations, or did they need
   "Other" often?
7. Was "Other" selected unusually often? Query `responses` for `q1` rows
   where `response_value` contains `"__other__"`.
8. Were any questions skipped frequently? A skipped question has no row
   at all in `responses` for that (session, question) pair — cross-
   reference against the full question list per session.
9. Were written answers sufficiently detailed for the research questions?
10. Did voice input work reliably? Ask participants directly — the
    database doesn't retain "typed vs. spoken" per response today.
11. Were transcripts accurate enough after the participant's own edits?
12. Did participants lose any responses? Compare local reports against
    what actually landed in `responses` — a duplicate-row or a missing
    row would show up here (the `UNIQUE(session_id, question_id)`
    constraint makes a true duplicate structurally impossible, but a
    _missing_ row is still worth checking for).
13. Did users understand progress? (percent + section name, not "question
    X of Y" — see if pilot feedback suggests otherwise.)
14. Did anyone abandon the form? Query `sessions` for `status IN
('started', 'in_progress')` rows with no `completed_at` and an old
    `last_activity_at`.
15. Did the collected answers provide the intended evidence for the
    research questions?
16. Did any technical problem affect response quality? Check server logs
    for `[interview]`/`[supabase]` warnings during the pilot window.

## After the pilot

- If question wording or routing changes as a result of this checklist,
  bump `QUESTIONNAIRE_VERSION` (see README "How to create a new
  questionnaire version") **before** collecting further data — pilot
  responses stay correctly attributed to the version they actually
  answered.
- If no material changes are needed, whether to fold the pilot sessions
  into the final analytical sample is a methodological decision for the
  researcher — the application does not do this automatically (see
  "Pilot data handling" in README).
- Set `STUDY_STAGE=main` in the deployment's environment variables once
  real data collection begins, so subsequent sessions are tagged
  accordingly.
