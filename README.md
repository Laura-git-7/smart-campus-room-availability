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

AC1 start must be strictly after the current time (valid, forward interval
within 00:00–24:00); AC2 duration greater than zero and at most 120 minutes;
AC3 blocked room is unavailable; AC4 overlapping bookings are unavailable
(touching endpoints allowed); AC5 checks never change existing bookings;
AC6 invalid input gets an understandable reason.
See AGENTS.md for constraints and verification rules.

## Project layout

src/lib/availability.ts   pure availability and validation logic
src/lib/sampleRoom.ts     fictional room and bookings
src/availability.test.ts  Vitest tests
src/App.tsx               UI
AGENTS.md                 instructions for coding agents