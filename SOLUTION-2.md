# SOLUTION-2: Testing Strategy and Coverage

## Table of Contents

- [Test Architecture](#test-architecture)
- [Test File Map and Rationale](#test-file-map-and-rationale)
- [When Each Test Class Runs](#when-each-test-class-runs)
- [Key Testing Decisions](#key-testing-decisions)
- [Coverage Results](#coverage-results)

---

## Overview

The test suite covers the full business surface: pure domain logic, server-side game state-machine transitions, WebSocket protocol parsing, real-time message handler integration, API error utilities, and React UI hooks. Each layer is tested in the most appropriate execution environment and with the most appropriate class of test.

---

## Test Architecture

### Two-package, two-runner design

The monorepo has two Vitest runners, one per workspace package:

| Runner          | Package            | Environment                       | Coverage scope      |
| --------------- | ------------------ | --------------------------------- | ------------------- |
| `packages/core` | `@battleship/core` | Node                              | `src/**/*.ts`       |
| `apps/web`      | `@battleship/web`  | Node (default) + jsdom (UI tests) | `lib/**/*.{ts,tsx}` |

Running them separately prevents test-environment cross-contamination and keeps CI feedback loops short — a failing domain test never blocks the UI suite from reporting.

### Environment switching in apps/web

`vitest.config.ts` uses `environmentMatchGlobs` to run `lib/ui/__tests__/**` files in jsdom and everything else in Node. This keeps the dependency on browser globals (`WebSocket`, `sessionStorage`, React DOM) scoped to only the tests that need them.

---

## Test File Map and Rationale

### packages/core

| File                                      | Tests | What is validated                                                                                         |
| ----------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `src/core/__tests__/board.test.ts`        | 29    | Coordinate bounds, placement collision, cell-state transitions                                            |
| `src/core/__tests__/fleet.test.ts`        | 10    | Ship factory, position generation per orientation                                                         |
| `src/core/__tests__/rules.test.ts`        | 18    | `validateShot` — all `GameRuleError` codes, happy path                                                    |
| `src/core/__tests__/scoring.test.ts`      | 23    | All three game modes × all score events                                                                   |
| `src/core/__tests__/game.test.ts`         | 21    | Full state-machine lifecycle (lobby → placement → playing → finished), `forfeitGame`, `handleTurnTimeout` |
| `src/core/__tests__/clock.test.ts`        | 6     | `makeFakeClock` determinism                                                                               |
| `src/core/__tests__/rng.test.ts`          | 5     | `makeSeededRng` reproducibility                                                                           |
| `src/server/__tests__/ids.test.ts`        | 6     | Format and uniqueness of all three ID generators                                                          |
| `src/server/__tests__/registry.test.ts`   | 10    | CRUD operations, list, test-reset helper                                                                  |
| `src/server/__tests__/protocol.test.ts`   | 18    | `parseClientMessage` — every message type, malformed payloads                                             |
| `src/server/__tests__/hub.test.ts`        | 17    | WebSocketHub: register/unregister lifecycle, `sendTo`, `broadcast`, `broadcastState`, singleton           |
| `src/server/__tests__/turn-timer.test.ts` | 7     | `TurnTimer`: start, cancel, callback firing, re-entry safety                                              |
| `src/server/__tests__/handlers.test.ts`   | 12    | `handleClientMessage` integration: PING, PLACE_FLEET, SHOOT, LEAVE_GAME, turn-timer elapse                |

### apps/web

| File                                        | Tests | What is validated                                                                       |
| ------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `lib/api/__tests__/errors.test.ts`          | 5     | `apiErrorResponse`, `handleApiError` — status codes, error shapes                       |
| `lib/ui/__tests__/playerSession.test.ts`    | 6     | `setPlayerId`, `getPlayerId`, `clearPlayerId` — scoping, overwrite, no-op               |
| `lib/ui/__tests__/useWebSocket.test.ts`     | 9     | State machine (connecting → open → closed), message delivery, `send()`, reconnect timer |
| `lib/ui/__tests__/GameProvider.test.tsx`    | 10    | Context API: state updates, shot events, timeout expiry, error dismiss, action senders  |
| `lib/ui/__tests__/placementReducer.test.ts` | 17    | All placement actions: SELECT, ROTATE, PLACE, REMOVE, RESET                             |

---

## When Each Test Class Runs

### Unit tests (pure logic, no I/O)

**Written first (TDD), run on every save.**
Covers `board.ts`, `scoring.ts`, `rules.ts`, `game.ts`, `clock.ts`, `rng.ts`, `fleet.ts`, `ids.ts`, `placementReducer.ts`, `playerSession.ts`.

These tests are the inner feedback loop. They run in under 50 ms and can be driven by a file-watcher during development. They document the invariants of the domain model independently of any framework.

### Integration tests (in-process, no network)

**Written alongside or immediately after the implementation, run in CI.**
Covers `registry.ts`, `turn-timer.ts`, `hub.ts`, `handlers.ts`, `useWebSocket.ts`, `GameProvider.tsx`, `errors.ts`.

Integration tests wire two or more modules together using lightweight fakes (mock sockets, fake clocks, seeded RNG). They prove that the wiring is correct without relying on a real network or a real browser.

### End-to-end tests (browser + server)

**Not automated in this exercise (UI cannot be fully tested without a running dev server).**
The golden path and leave-game flows were manually verified in the browser. Production readiness would require adding Playwright or Cypress tests as a separate CI stage run after `pnpm build`.

---

## Key Testing Decisions

### Time injection instead of mocking

`Date.now()` and `setTimeout`-based timers are injected via `Clock` and `Rng` interfaces rather than patched globally. Where the real `setTimeout` must be used (turn timer, reconnect), `vi.useFakeTimers()` is activated per test and restored in `afterEach`. This keeps tests deterministic without polluting the global state between runs.

### Execution-order independence

Every test sets up its own state via `beforeEach` using `__resetRegistryForTests()` and `__resetHubForTests()`. Tests that need a specific game phase build it programmatically through public API calls (`createGame`, `addSecondPlayer`, `placeFleet`) rather than importing raw fixtures.

### Mocks only at system boundaries

`next/server` (`NextResponse`) is mocked in `errors.test.ts` because it is an external framework boundary — importing it in a plain Node environment has side effects. `WebSocket` is globally stubbed in hook tests because it is a browser API not available in Node. No other module is mocked; all internal dependencies are exercised through their real implementations.

### GAME_NOT_FOUND edge case

When a player's socket is registered in the hub under a gameId that has since been removed from the registry (e.g., GC, expiry), the error response must still reach the player. Tests simulate this by registering the player's socket under the "missing" gameId before exercising the handler:

```ts
deps.hub.register('MISSING', 'host', hostSock);
handleClientMessage(deps, { gameId: 'MISSING', playerId: 'host' }, ...);
```

### Single-cell submarine constraint

The test fleet uses a Submarine (1 cell) for brevity. Hitting its only cell always ends the game, so "timer restarts on a non-final shot" tests shoot at an empty cell (5,5) — a guaranteed miss — to exercise the mid-game timer restart branch without requiring a multi-cell fleet.

---

## Coverage Results

```
packages/core:  198 tests — 14 test files
apps/web:        47 tests —  5 test files
Total:          245 tests — 19 test files
```

apps/web lib coverage (v8):

- Statements: 93.27 %
- Branches: 86.40 %
- Functions: 92.00 %
- Lines: 93.27 %

All configured thresholds (80 % statements/functions/lines, 75 % branches) are satisfied.
