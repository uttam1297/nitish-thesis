// Test-only stand-in for the real `server-only` package: Next's bundler
// no-ops that import on the server and only throws when a Client
// Component tries to import it. Vitest has no such bundler pass, so this
// alias (see vitest.config.ts) keeps server-only modules importable in
// tests without weakening the real guard used at build time.
export {};
