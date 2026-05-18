# Battleship — ASSE Technical Assessment

Real-time Player vs. Player Battleship game built with Next.js App Router, React 19, TypeScript, Tailwind CSS v4, and a custom WebSocket server.

---

## Prerequisites

- **Node.js** ≥ 20 (see `.nvmrc`)
- **pnpm** ≥ 9

```bash
nvm use          # switch to the project's Node version
npm install -g pnpm@latest  # if pnpm is not already installed
```

---

## Install

```bash
pnpm install
```

---

## Run

### Development

```bash
pnpm dev
```

Opens at [http://localhost:3000](http://localhost:3000). The dev server wraps Next.js with a custom Node HTTP + WebSocket server (`server.ts`) so hot-module reload and the WebSocket upgrade path coexist.

### Production

```bash
pnpm build    # compile Next.js output
pnpm start    # serve the production build
```

---

## Test

```bash
pnpm test                                  # run all Vitest unit + integration tests
pnpm test --coverage                       # run tests with V8 coverage report
pnpm -F @battleship/web test:a11y          # run Playwright accessibility tests (requires Chrome)
pnpm -F @battleship/web test:a11y:ui       # open Playwright UI for interactive a11y debugging
```

## Lint

```bash
pnpm lint
```

## Bundle analysis

```bash
pnpm -F @battleship/web analyze
```

## Lighthouse audit

Requires the dev or production server to be running first:

```bash
pnpm dev                          # in one terminal
pnpm -F @battleship/web lighthouse  # in another
```

Report is written to `apps/web/.lighthouse/report.html`.

---

## Solutions

| Exercise | Topic                                                 | Document                       |
| -------- | ----------------------------------------------------- | ------------------------------ |
| 1        | Core game — matchmaking, board, turns, scoring, modes | [SOLUTION-1.md](SOLUTION-1.md) |
| 2        | Test suite — strategy, coverage, and rationale        | [SOLUTION-2.md](SOLUTION-2.md) |
| 3        | Design — concurrency and disconnection handling       | [SOLUTION-3.md](SOLUTION-3.md) |
| 4        | Design — Spectator Mode (live + replay)               | [SOLUTION-4.md](SOLUTION-4.md) |

---

## Production Readiness

Intentional gaps outside the assessment scope (i18n, observability, security headers, CI/CD, etc.) are documented with their trade-off rationale in [MVP-SCOPE.md](MVP-SCOPE.md).
