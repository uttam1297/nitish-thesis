# Nitish thesis interview prototype

An accessible, configuration-driven prototype of a guided expert research
interview. It uses the verbatim Q1-Q18 prompts from `question-set.md`.

## Stack

Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, Motion, Zod, Vitest,
React Testing Library, and Playwright.

## Architecture

```text
UI screens and primitives
  → interview engine (reducer + conditional flow)
    → local autosave / resume / submission repositories
      → validated research configuration
```

Question wording and Q1 options are sourced exclusively from
`question-set.md`. The duplicated wording of Q10 and Q11 is intentionally
preserved because it is present in the source file.

Phase 2 adds:

- Real browser speech recognition behind a swappable
  `VoiceTranscriptionAdapter`, with a graceful typing fallback whenever it is
  unsupported, denied, or fails.
- Config-driven conditional question visibility (`visibleWhen` rules).
- Local autosave and resume via `DraftStorage`, and a simulated submission
  via `InterviewRepository` — both are the seams Phase 3 will replace with a
  Supabase-backed implementation, without touching the engine or screens.

There is still no database, authentication, admin dashboard, export, or
AI analysis — Phase 3 territory.

## Commands

```bash
npm install
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Open <http://localhost:3000/interview> during local development.
