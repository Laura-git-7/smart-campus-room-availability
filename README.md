# Smart Campus Room Availability Checker

Room availability checker for one fictional campus room, built in Bolt.new.
All data is fictional; there is no backend, database, login or permanent booking creation.

## Setup

npm install

## Scripts

npm run dev        # start the dev server
npm run build      # production build
npm run preview    # preview the production build
npm test           # Vitest (vitest run)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit -p tsconfig.app.json

## Rules (AC1–AC6)

Working hours 08:00–20:00, duration 15–240 minutes, past and reversed
intervals rejected, blocked room rejected, overlap with an existing
booking rejected (touching endpoints allowed). Fixtures are never mutated.
See AGENTS.md for constraints and verification rules.

## Project layout

src/lib/availability.ts   pure availability and validation logic
src/lib/sampleRoom.ts     fictional room and bookings
src/availability.test.ts  Vitest tests
src/App.tsx               UI
AGENTS.md                 instructions for coding agents