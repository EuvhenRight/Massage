# Testing

This project uses a layered testing strategy. Each layer answers a different
question, runs at a different speed, and gates a different stage of the
delivery pipeline.

| Layer       | Tool                              | Purpose                                           | Speed  |
| ----------- | --------------------------------- | ------------------------------------------------- | ------ |
| Type        | `tsc --noEmit`                    | Compile-time guarantees                           | < 30 s |
| Lint        | `next lint`                       | Code style, common pitfalls                       | < 30 s |
| Unit        | Vitest (node)                     | Pure-function correctness, schema validation      | < 1 s/test |
| Integration | Vitest + Firestore emulator + MSW | Lib functions against real Firestore + mocked I/O | < 5 s/test |
| Component   | Vitest (jsdom) + RTL              | Modal / form behaviour without a browser          | < 2 s/test |
| E2E smoke   | Playwright                        | App boots, sign-in renders                        | ~ 30 s |
| E2E full    | Playwright                        | Critical user journeys end-to-end                 | ~ 5 min |

## Commands

```bash
npm test                  # unit + integration (no emulator)
npm run test:watch        # local TDD
npm run test:coverage     # produces ./coverage/index.html
npm run emulators         # Firestore emulator on 127.0.0.1:8080
npm run emulators:exec -- 'npm test'     # one-shot integration run
npm run test:e2e          # Playwright (needs dev server)
npm run typecheck         # tsc --noEmit
npm run lint              # next lint
```

In CI (`.github/workflows/ci.yml`):

- `static` — typecheck + lint, blocks the rest if it fails
- `unit` — Vitest under the Firestore emulator, uploads `coverage/`
- `e2e-smoke` — Playwright `smoke.spec.ts` only

## Folder layout

```
tests/
├── setup.ts                   # vitest global setup (MSW listen + env fallbacks)
├── mocks/
│   ├── server.ts              # MSW node server (re-exports requestLogs)
│   └── handlers/
│       ├── twilio.ts          # Twilio Messages API mock
│       └── resend.ts          # Resend Emails API mock
├── helpers/
│   └── firestore-emulator.ts  # initEmulatorFirestore + wipeFirestore
├── unit/
│   └── lib/
│       ├── phone-e164.test.ts
│       └── booking-schema.test.ts
└── integration/               # Phase 2: write here
    └── lib/
        └── (booking, clients, cron tests)

e2e/                           # Playwright lives here (existing)
.github/workflows/
└── ci.yml                     # PR + push pipeline
```

## Conventions

- **One behaviour per test.** Title describes the behaviour, not the function.
  `rejects overlapping appointment when prep buffer violated`, not
  `bookAppointment - case 7`.
- **AAA layout.** Arrange, Act, Assert separated by blank lines.
- **Fixtures over `beforeEach` setup.** Build entities through small factories
  (`aClient({ optInMarketing: true })`) so the test reads top-down.
- **Mock at the boundary.** Mock the Twilio HTTP endpoint, not
  `notifyCustomerWhatsAppBirthday`. We need the real code path under test.
- **Isolated state.** Each Firestore-touching test wipes the emulator via
  `wipeFirestore()` in `beforeEach`. Test order is never load-bearing.
- **No `await new Promise(r => setTimeout(r, …))`.** If you need to wait,
  use Playwright locators or `vi.waitFor(...)`.

## Coverage strategy

Coverage is measured under `lib/**` and `app/api/**` only — component coverage
is captured indirectly through interaction tests and E2E. Floor is set in
`vitest.config.ts`:

- lines: 70%
- branches: 60%
- functions: 70%
- statements: 70%

These numbers ramp up across the phases:

| Phase | Floor (lines) | Why                                            |
| ----- | ------------- | ---------------------------------------------- |
| 1     | 70            | Foundation; only 2 modules tested              |
| 2     | 80            | After P0 modules ship full coverage            |
| 3     | 85            | After admin E2E covers the rest                |

Coverage is **not the goal** — risk coverage is. Use `npm run test:coverage`
to spot gaps, then ask "what business impact does an uncovered branch have?"
before writing a test for it.

## Priority matrix (testing roadmap)

| Tier | What                                                                                                  | When                |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| P0   | `bookAppointment`, `clients-firestore`, `phone-e164`, `booking-schema`, cron `send-reminders`         | Phase 1–2 (current) |
| P1   | Admin appointment modal, drag-reschedule, cancellation, agenda filters                                | Phase 3             |
| P2   | Public booking flow (timed, TBD, day), birthday + opt-in submission, multi-locale                     | Phase 4             |
| P3   | Analytics KPI maths, period boundaries, price resolution, service localisation                        | Phase 5             |
| P4   | i18n smoke, motion / visual polish                                                                    | Phase 5             |

## How to add a new test

1. Pick the right tier. If it's a pure function in `lib/`, write a unit test.
   If it touches Firestore, write an integration test. If it touches the
   browser, write a component or E2E test.
2. Follow the AAA convention.
3. If the SUT calls Twilio / Resend, add an MSW handler override only inside
   the negative-path test (`server.use(respondWithTwilioError(63016))`) —
   the default mocks already return success.
4. Run `npm run test:watch` while iterating, then `npm run test:coverage`
   before pushing to make sure the new lines actually move the needle.

## Phase plan (rest of the rollout)

See the project chat history for the full plan. Quick recap:

- **Phase 1 (done)**: foundation + 2 example unit tests + CI.
- **Phase 2**: `book-appointment.ts` + `clients-firestore.ts` integration
  tests against the emulator; cron `send-reminders` integration test with
  Twilio mock.
- **Phase 3**: admin E2E — login, calendar create, drag reschedule, cancel,
  clients page.
- **Phase 4**: public booking E2E — timed + TBD + birthday + opt-in.
- **Phase 5**: analytics KPI unit tests + edge cases (DST, leap year,
  string-priced items).
