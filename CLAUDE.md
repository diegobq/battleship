# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

Package manager: **pnpm** (a `pnpm-workspace.yaml` exists at the root to allow native builds for `sharp` and `unrs-resolver`).

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the Next.js dev server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint (flat config in `eslint.config.mjs`) |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test --coverage` | Run Vitest with V8 coverage report |

---

## Architecture

Next.js **16.2.6** App Router on **React 19.2.4**, TypeScript strict mode, Tailwind CSS **v4**.

- **App Router only.** All routes live under `app/`. `app/layout.tsx` is the root layout; it loads Geist + Geist Mono via `next/font/google` and exposes them as CSS variables (`--font-geist-sans`, `--font-geist-mono`). New pages must follow App Router file conventions (`page.tsx`, `layout.tsx`, `route.ts`) — there is no `pages/` directory.
- **Tailwind v4, no `tailwind.config`.** Tailwind is wired up purely through the PostCSS plugin (`postcss.config.mjs`) and configured inline in `app/globals.css` via `@import "tailwindcss"` and the `@theme inline { … }` block. Extend the design system by editing that block, not a JS config file.
- **Path alias.** `@/*` maps to the repository root (`tsconfig.json`), so `import Foo from "@/lib/core/types"` works from anywhere.
- **ESLint flat config** (`eslint.config.mjs`) extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Preserve the explicit ignore list (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`) when adding new ignores.
- **Testing:** Vitest (`^2.1.9`) with V8 coverage (`@vitest/coverage-v8`). No test runner is configured yet — add `vitest.config.ts` when writing the first test.

### Source Layout

```
app/
  layout.tsx        # Root layout — fonts + global CSS
  page.tsx          # Entry route (/)
  globals.css       # Tailwind v4 theme tokens
lib/
  core/             # Pure domain logic (no framework deps)
    types.ts        # Domain models (GameState, Ship, Coordinate, …)
    board.ts        # Spatial logic: placement, bounds, collision
    scoring.ts      # Score calculation, bonuses, penalties
    game.ts         # High-level state-machine transitions
```

Backend API handlers live at `app/api/**` following Next.js Route Handler conventions (`route.ts`).

---

## Project Context: eDreams ODIGEO ASSE Battleship Assessment

### Goal

Build a production-grade, real-time, online Player vs. Player (PvP) Battleship game to pass the **Advanced Senior Software Engineer (ASSE)** technical evaluation.

The system must demonstrate:
- Strict FE / BE separation of concerns
- High scalability, maximum cohesiveness, minimal coupling
- Production-grade code quality (assessment matrix below)

### Technology Constraints

| Allowed | Forbidden |
|---|---|
| Node.js (JS/TS) for BE | Game engines (Phaser, PixiJS, Three.js, etc.) |
| React, Vue, Angular, Tailwind, CSS Modules for FE | Physics libraries |
| Any AI tooling (code evaluated as candidate's own) | — |

Real-time bidirectional state sync between two clients is required.

---

## Coding Guidelines (Assessment Matrix)

These rules are hard requirements, not style preferences.

### Structure
- No duplicated code.
- Functions/methods must be **≤ 50 lines**.
- Classes/modules must be **≤ 300 lines**.
- Parameter lists must have **≤ 10 arguments**.

### Readability
- Consistent formatting and wise naming conventions.
- Add comments only when they add value (non-obvious constraints, invariants, workarounds).
- Avoid nested conditionals; prefer exceptions over error-code returns.
- Follow **Command Query Separation** — a function either changes state or returns a value, never both.

### Optimization
- Use the optimal data structure for the context (e.g., `Map`/`Set` instead of `Array`/`Object` where look-up is the dominant operation).
- The game board is an 8×8 2D array of `BoardCellStatus` — `O(1)` coordinate access. The design
must allow new ship sizes/forms to be easily added (extensibility).

### Design Patterns
- Apply design patterns where they reduce coupling.
- Maintain **minimal coupling** (no environment, content, hybrid, or control coupling).
- Maximize **cohesiveness** within each module.

---

## Architectural & Design Requirements

Beyond the core logic, the development of this application must adhere to the following
strategic and technical guidelines:

- **Web App Store Publishing**: The final product is intended to be published in a Web
Application Store in the future. The code must be production-ready, secure, and
optimized for a public release.
- **Scalability for Multiple Teams**: The architecture must be highly modular. Multiple
teams will work on this web app simultaneously in the future, so enforcing a
clean separation of concerns, minimal coupling, and maximum cohesiveness is
mandatory.
- **Mobile-First Approach**: The user interface must be designed mobile-first. The
layout, interactions (like drag-and-drop), and visual hierarchy must be perfectly
optimized for touchscreens and smaller viewports before scaling up to desktop
displays.
- **Dynamic UI Customization**: The system must be built to accept UI customization
and theming easily. The design should allow for seamless CSS scoping and
swapping of styles without touching the core game logic (For example: The
marketing team needs to be able to apply a special "Christmas style" skin to the  
entire game interface during the holiday season).

---

## Testing Guidelines

- Every code path must be covered, including difficult-to-spot corner cases.
- Tests must be **execution-order independent** — each `it()` block instantiates its own fresh state.
- Strict separation of concerns in tests: do not mix formatting, marshalling, and behavior assertions in the same test.
- Use mocks/stubs only with a clear, documented rationale.
- Avoid redundant tests unless there is a specific, documented reason.
- Time dependencies (e.g., `Date.now()` for the reflex bonus) must be injected as arguments, not mocked, to keep tests deterministic.

---

## Defined API Contract

### REST Endpoints

| Method | Path | Payload |
|---|---|---|
| `POST` | `/api/game/create` | `{ mode: 'Elite' \| 'Classic' \| 'Risk', playerName: string }` |
| `POST` | `/api/game/join` | `{ gameId: string, playerName: string }` |

### WebSocket

`/api/game/stream?gameId={id}&playerId={id}`

**Client → Server**

```ts
{ type: 'PLACE_FLEET', payload: { ships: { id, r, c, orientation }[] } }
{ type: 'SHOOT',       payload: { r: number, c: number } }
```

**Server → Client**

```ts
{ type: 'GAME_STATE_UPDATE', payload: GameState }
{ type: 'SHOT_RESULT',       payload: { shooterId, r, c, hit, sunkShipType, scoreAwarded } }
{ type: 'ERROR',             payload: { message: string } }
```

**Rationale:** WebSockets over SSE+REST because the Reflex Bonus (reward for shots within 3 s) requires minimum latency. Bidirectional persistent TCP eliminates HTTP header overhead per round-trip.

---

## Game Rules Reference

### Board
- 8×8 grid, columns A–H, rows 1–8.
- Ships: **Cruiser** (3 cells), **Destroyer** (2 cells), **Submarine** (1 cell).
- Placement: horizontal or vertical only.

### Turn Mechanics
- Dice roll decides who starts.
- Default turn timer: **60 seconds**.
- Boards: "My Board" + "Enemy Board" synced in real-time.

### Scoring Engine

| Event | Points |
|---|---|
| Base hit | 10 |
| Dynamic accuracy bonus | Higher reward for low-probability hits |
| Consecutive hit multiplier | ×1.5 → ×2 → ×3 |
| Reflex bonus (hit within 3 s) | Extra points |
| Miss penalty | Deduction (floor at 0) |

### Game Modes

| Mode | Rules |
|---|---|
| **Elite** ("Fastest and Precise") | All bonuses and penalties active |
| **Classic** ("Simple") | 1 pt/hit, no bonuses or penalties |
| **Risk** ("Penalties") | 10 pts/hit, −1 pt/miss |

---

## Exercises & Deliverables

| # | Type | Deliverable |
|---|---|---|
| 1 | **Code** — Core game (matchmaking, board, turns, scoring, modes) | Working FE/BE + `SOLUTION-1.md` |
| 2 | **Code** — Test suite (Vitest) | Working tests + `SOLUTION-2.md` |
| 3 | **Design only** — Concurrency & disconnection handling | `SOLUTION-3.md` |
| 4 | **Design only** — Spectator Mode (live + replay) | Class & Sequence Diagrams + `SOLUTION-4.md` |

---

## Workflow Contract

1. Execute tasks strictly in order: Exercise 1 → 2 → 3 → 4.
2. **Atomic commits:** one behavioral change per commit; no mixed refactor/feature commits.
3. **TDD for coding tasks:** write a failing test first, implement, then refactor.
4. Before committing: run `pnpm lint` and relevant tests. If blocked, document the limitation.
5. **Commit message format:** `EX{n}: imperative summary` (e.g., `EX1: add placement validation`).
6. Docs commits must be separate from code commits unless required by the same behavior change.
7. Any major decision must add a short rationale paragraph to the matching `SOLUTION-X.md`.
8. Do not start a later exercise while an earlier one has open acceptance criteria.

---

## Agentic Directives

When generating code or architecture documents:

1. Implement exercises in order — never jump ahead while an earlier exercise is incomplete.
2. Enforce the ≤ 50-line method / ≤ 300-line class hard limits. Split proactively.
3. After every significant architectural decision, output a short paragraph suitable for the matching `SOLUTION-X.md` so the candidate can justify the choice to the interviewers.
4. UI changes require testing the golden path in a browser before reporting done. If a dev server cannot be started, say so explicitly.
