# eProduct – Product Catalogue PoC
Stack: React+TS (Vite) · Node+TS Express 5 · SQLite (better-sqlite3) · Mailpit · Vitest/RTL

## Rules
- Web never calls Fake Store; all data via /api.
- Services depend on interfaces (ProductRepository, EmailSender); only server.ts creates adapters.
- Validate every input with Zod at the route; validate upstream responses too.
- SQL: prepared statements only; never interpolate.
- No secrets in code; new config goes in .env.example.
- Keep it minimal: no unused files, no new deps without a reason.
- Every change ships with a test; run `npm test` before finishing.

## Commands
docker/podman compose up --build
