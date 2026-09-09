# Nitish thesis interview prototype

Phase 1 provides a static, accessible prototype for a guided expert research
interview. It uses the verbatim Q1-Q18 prompts from `question-set.md` and does
not save or transmit participant input.

## Stack

Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, Motion, Zod, Vitest,
React Testing Library, and Playwright.

## Architecture

```text
UI screens and primitives
  → in-memory prototype state
    → validated research configuration
```

Question wording and Q1 options are sourced exclusively from
`question-set.md`. The duplicated wording of Q10 and Q11 is intentionally
preserved because it is present in the source file.

Phase 1 has no database, autosave, resume behavior, real speech recognition,
authentication, conditional routing, or network submission. The voice control
inserts a clearly identified sample transcript that remains editable.

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
