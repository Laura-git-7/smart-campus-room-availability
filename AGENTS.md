## Project
Smart Campus room availability checker; one room, fictional data, built in Bolt.new.

## Constraints
- Preserve AC1–AC6 (booking rules, working hours 08:00–20:00, duration 15–240 mins, room block check, conflict detection).
- No backend, database, user login, or permanent booking creation required.

## Engineering rules
- Keep the UI responsive and intact.
- Use pure functions for availability and validation logic.
- Do not mutate booking fixtures directly in components.

## Verification
- Run existing Vitest tests and ensure 100% pass rate.
- Report changed files, rationale, and test verification output.