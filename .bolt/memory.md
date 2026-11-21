# Project memory

## Product intent & audience

- Local-only room booking system for a single fictional room; no real users, no backend.
- Likely a coding exercise / spec-implementation project: acceptance criteria (AC1–AC6) define the rules an agent must preserve and verify.
- Documentation files: `AGENTS.md` (agent operating rules), `README.md` (project overview + layout).

## Brand personality & voice

- Technical, precise, documentation-first tone; values explicit rules and traceable verification.
- Prefers minimal, surgical edits to docs; changes proposed before applied.

## Visual design & UX direction

- No UI work surfaced yet; current focus is logic, tests, and documentation.
- Stack: Vite + React + JSX, Tailwind CSS, Lucide React icons, `@/` alias → `src/`.
- No additional UI/icon packages unless explicitly requested.

## Decisions, constraints & rationale

- One fictional room; no login, database, or persistent booking creation.
- No secrets, API keys, or credentials allowed.
- No external deployments, outbound network calls, or third-party services; local-only. Generic environment guidance (e.g. Supabase availability) must not override this.
- AC1–AC6 (inferred definitions): AC1 interval bounds/ordering (start > now, start < end, 0 ≤ start, end ≤ 24:00, "24:00" formatting); AC2 duration 15–240 min inclusive; AC3 blocked room always unavailable; AC4 overlap rejected (touching endpoints allowed); AC5 pure rules, fixtures never mutated; AC6 working hours 08:00–20:00.
- Testing: Vitest; must run and pass before proposing acceptance.
- Known issue: test suite uses `it.fails(...)` markers for unimplemented spec gaps — 100% pass rate can mask missing AC coverage. Proposed rule: no `it.fails` markers may remain at acceptance.
- Real test file path is `src/lib/availability.test.ts`; README lists `src/availability.test.ts` (drift, not yet fixed).
- Patch to AGENTS.md drafted but not yet applied — awaiting user approval. Adds AC definitions, no-secrets/no-external rules, stronger test-verification clause.

## Open questions & assumptions

- Whether user approves the AGENTS.md patch (Edits 1–3) and optional README path fix (Edit 4).
- Whether `it.fails` markers should be removed now or only at final acceptance.
- Exact source file names for the booking logic (assumed `src/lib/availability.ts`) — not yet confirmed by listing.