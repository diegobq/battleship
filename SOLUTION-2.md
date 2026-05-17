# SOLUTION-2.md — Exercise 2: Testing Strategy & Coverage

## 1. Overview

The test suite covers the full Battleship application stack in two independent Vitest runners — one for the framework-free domain package (`packages/core`) and one for the Next.js web app (`apps/web`). Together they contain **309 tests across 25 files** and exceed all configured coverage thresholds.

The design is driven by three principles:

1. **Test what matters at the right layer.** Pure functions are unit-tested with no setup. Stateful server infrastructure is integration-tested with in-memory fakes. Browser hooks are behaviourally tested in an isolated DOM environment.
2. **Honest coverage.** Every number in this document reflects a real `pnpm -r test:coverage` run. Nothing is claimed that the runner did not print.
3. **No coupling through mocks.** Mocks are used only at system boundaries (the browser `WebSocket` constructor, Next.js `NextResponse`) and never to make an internal module easier to test — that would be a coupling smell, not a safety net.

---

## 2. Test Architecture

### Two-runner setup

| Package         | Vitest environment                                     | Config                           |
| --------------- | ------------------------------------------------------ | -------------------------------- |
| `packages/core` | `node` (single env — no DOM globals)                   | `packages/core/vitest.config.ts` |
| `apps/web`      | `node` default + `happy-dom` for `lib/ui/__tests__/**` | `apps/web/vitest.config.ts`      |

The two runners stay separate because the core package must not pull in DOM globals. Leaking a browser API into `packages/core` would mask a real coupling bug between the domain layer and the framework layer.

### Why happy-dom instead of jsdom

The initial runner used jsdom. jsdom 29.1.1 transitively requires `@exodus/bytes/encoding-lite.js` (via `html-encoding-sniffer@6`), which is an ESM-only module required from CJS — causing an `ERR_REQUIRE_ESM` crash before any tests could be collected. happy-dom has no such dependency and is fully supported by Vitest's `environmentMatchGlobs` mechanism. It is also noticeably faster (environment spin-up is ~1.4 s vs jsdom's ~3+ s for this suite).

### Coverage thresholds

| Package         | Statements | Branches | Functions | Lines | Rationale                                                                                                                                                           |
| --------------- | ---------- | -------- | --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` | 95%        | 90%      | 95%       | 95%   | Pure domain logic — every branch is reachable through input alone; a threshold below 90% branch would leave real edge cases dark.                                   |
| `apps/web`      | 80%        | 75%      | 80%       | 80%   | UI hooks carry unreachable browser-only branches (e.g., `navigator.vibrate` absent, `matchMedia` callbacks) where honest relaxation is better than phantom mocking. |

### Layering

| Layer                 | Question answered                                                                                          | Where it runs                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Unit**              | Does this pure function honour its invariants for every input class?                                       | `packages/core/src/core/__tests__/`, `packages/core/src/api/__tests__/`, `apps/web/lib/ui/__tests__/` (pure reducers) |
| **Integration**       | Do two or more modules wire together correctly using lightweight fakes?                                    | `packages/core/src/server/__tests__/` (registry, hub, timer, handlers, protocol)                                      |
| **Behavioural (DOM)** | Does this hook/provider produce the expected sequence of state transitions given simulated browser events? | `apps/web/lib/ui/__tests__/` (hook tests under happy-dom)                                                             |

---

## 3. Test Plan — Module by Module

### `packages/core` — domain and server infrastructure

| File                                     | Tests | Key invariants pinned                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/__tests__/clock.test.ts`           | 6     | `makeSystemClock` delegates to `Date.now()`; `makeFakeClock` starts at seed, `advance` adds, `set` replaces, combined                                                                                                                                                                                                                                                                                                |
| `core/__tests__/rng.test.ts`             | 5     | `makeSystemRng` in [0,1); `makeSeededRng` in [0,1), deterministic, different seeds differ, non-zero output                                                                                                                                                                                                                                                                                                           |
| `core/__tests__/board.test.ts`           | 29    | `isInBounds` corners + off-by-one + custom size; `expandShipCells` h/v/length-1; `canPlace` empty/collision/OOB; `applyPlacement` null on invalid/cells marked/immutability/ship metadata; `applyShot` miss/hit/alreadyShot/OOB/immutability; `countHiddenCells`/`areAllShipsPlaced`/`areAllShipsSunk` empty/partial/complete                                                                                        |
| `core/__tests__/fleet.test.ts`           | 8     | `defaultFleetConfig` copy+values; `buildFleet` 3 ships/correct lengths/idFactory called N times/unplaced+zero-hits/count>1/count=0 skipped                                                                                                                                                                                                                                                                           |
| `core/__tests__/rules.test.ts`           | 21    | `GameRuleError` code/message/name; `getOpponentId` happy path/UNKNOWN_PLAYER/INVALID_PLAYER_COUNT; `decideFirstPlayer` within ids/deterministic/empty throws; `validateShot` all 5 error codes; `resolveWinCondition`/`resolveTurnStrategy`/`alternatingTurnStrategy`/`hitKeepsTurnStrategy`; `isGameOver` sunk/not-sunk                                                                                             |
| `core/__tests__/scoring.test.ts`         | 29    | Classic 1pt/0 penalty/streak; Risk 10pt/-1; Elite accuracy at p=1/p≈0/midpoint; Elite consecutive multiplier indices 0→1→1.5x→2x→3x clamp; Elite reflex exactly at boundary/+1ms/1ms; Elite miss resets streak; `calculateHitScore` and `calculateMissPenalty` public API; helpers `calculateProbabilityOfHit`/`getConsecutiveHitMultiplier`/`resolveEliteConfig`                                                    |
| `core/__tests__/game.test.ts`            | 27    | `createPlayer`/`createGame`; `addSecondPlayer` transitions/fleet built/throws; `placeFleet` ready/both-ready→playing/one-ready stays placement/count mismatch/collision; `processShot` miss/hit/sunkShipType/gameOver+winnerId/turn alternates/floor-at-zero/immutability; `handleTurnTimeout` advances turn/resets streak/updates clock/throws non-playing; `forfeitGame` finished+winner/no-op if already finished |
| `api/__tests__/dto.test.ts`              | 25    | `parseCreateGameRequest`/`parseJoinGameRequest` valid/trim/non-object/missing/empty/long/bad-mode/all-3-modes/gameName optional/fleet valid/unknown-type/non-integer/over-10/zero-total/turnTimerMs valid/below-min/above-max; `ApiError` class shape                                                                                                                                                                |
| `server/__tests__/ids.test.ts`           | 6     | `newGameId` 8 chars/200 unique; `newPlayerId` 36 chars/dashes at right positions/200 unique; `newShipId` 12 chars/no dashes/200 unique                                                                                                                                                                                                                                                                               |
| `server/__tests__/registry.test.ts`      | 11    | create/get/get-undefined/create-duplicate-throws/update applies+returns/update-undefined/list all/listJoinable filters/delete true/false/reset; `isRegistryInitialized` true after init/false after reset                                                                                                                                                                                                            |
| `server/__tests__/lobby-emitter.test.ts` | 6     | notify fans-out/unsubscribe removes/subscriberCount reflects/unsubscribe-inside-notify safe/singleton/reset creates fresh                                                                                                                                                                                                                                                                                            |
| `server/__tests__/turn-timer.test.ts`    | 7     | callback fires at ms/not before/cancel prevents/cancel true+false/start replaces existing/has() true+false/cancelAll removes all                                                                                                                                                                                                                                                                                     |
| `server/__tests__/protocol.test.ts`      | 18    | `parseClientMessage` PING/LEAVE_GAME/SHOOT valid+field errors/PLACE_FLEET valid+field errors/bad-JSON/missing-type/unknown-type; `sanitizeGameStateFor` viewer unchanged/opponent ship hidden/hit+miss visible/positions hidden until sunk/revealed when sunk                                                                                                                                                        |
| `server/__tests__/hub.test.ts`           | 13    | `sendTo` delivers/false-not-registered/false-closed/register-closes-existing/unregister removes+cleans-game/broadcast all-open+skips-closed/broadcastState GAME_STATE_UPDATE/size reflects/getHub singleton+reset/`isHubInitialized` true+false                                                                                                                                                                      |
| `server/__tests__/handlers.test.ts`      | 11    | PING→PONG sender-only; SHOOT hit broadcasts SHOT_RESULT; SHOOT miss broadcasts SHOT_RESULT hit=false; SHOOT WRONG_TURN sends ERROR; SHOOT GAME_NOT_FOUND; SHOOT starts turn timer; SHOOT INTERNAL error path; LEAVE_GAME forfeits+broadcasts; PLACE_FLEET success broadcasts+starts timer; PLACE_FLEET GAME_NOT_FOUND; turn timer elapse broadcasts TURN_TIMEOUT                                                     |

### `apps/web` — web application

| File                                           | Tests | Key invariants pinned                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api/__tests__/errors.test.ts`             | 5     | `apiErrorResponse` status code/error envelope; `handleApiError` delegates ApiError/500 for Error/500 for unknown                                                                                                                                                                                   |
| `lib/ui/__tests__/placementReducer.test.ts`    | 22    | `initPlacementState` selects first/resets placed/blank grid; SELECT known+unknown; ROTATE h→v→h; PLACE valid/advances selection/null-when-all-placed/OOB no-op/collision no-op/no-selection no-op; REMOVE unplaces+clears/no-op unplaced; RESET clears all; `allShipsPlaced`/`canPreviewPlacement` |
| `lib/ui/__tests__/playerSession.test.ts`       | 6     | `setPlayerId`/`getPlayerId` stores/scopes per gameId/null-unknown/overwrites; `clearPlayerId` removes/no-op when empty                                                                                                                                                                             |
| `lib/ui/__tests__/useTheme.test.ts`            | 7     | starts default/reads stored on mount/`setTheme` updates state+storage+DOM attribute/default removes attribute/non-default sets attribute/exposes THEMES array                                                                                                                                      |
| `lib/ui/__tests__/useToast.test.ts`            | 7     | error+info adds with variant/dismiss removes by id/clearAll empties/subscribe notifies on add+dismiss/unsubscribe stops notifications                                                                                                                                                              |
| `lib/ui/__tests__/useShotAnnouncement.test.ts` | 10    | `formatShot` own hit+miss+sunk/opponent hit+miss+sunk/column letter; `useShotAnnouncement` starts empty/appends on shot/accumulates multiple                                                                                                                                                       |
| `lib/ui/__tests__/useShotFeedback.test.ts`     | 6     | no-throw for hit+miss+sunk/skips when sfx=off/vibrates [20,40,20] on sunk/vibrates 50 on hit                                                                                                                                                                                                       |
| `lib/ui/__tests__/useOptimisticShots.test.tsx` | 6     | starts empty/addPending marks/idempotent/reconcile removes/reconcile no-op/multiple tracked independently                                                                                                                                                                                          |
| `lib/ui/__tests__/useWebSocket.test.ts`        | 9     | connecting state/idle when url null/open transition/closed transition (maxReconnects:0)/error transition/delivers messages to callback/send() true+forwards when OPEN/send() false when not open/reconnects after close                                                                            |
| `lib/ui/__tests__/GameProvider.test.tsx`       | 9     | starts connecting+no-state/open transition/GAME_STATE_UPDATE sets state/SHOT_RESULT sets lastShot/TURN_TIMEOUT sets turnExpiredPlayerId/clears after 2s/ERROR sets errorMessage/dismissError clears/disconnect transitions                                                                         |

---

## 4. When Each Test Class Runs

| Stage                                                                       | What runs                                                                       | Why                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TDD inner loop** (file watcher, `pnpm -F <pkg> test --watch`)             | Unit tests for the file being edited                                            | Sub-second feedback; the developer is changing one file at a time and needs the tightest possible loop                                              |
| **Pre-commit** (`pnpm -r test` + `pnpm -r lint`)                            | Unit + integration + behavioural across both packages                           | Catches cross-module regressions before they enter git history; fast enough (~5 s total) to run on every commit without blocking flow               |
| **CI on PR** (`pnpm -r test:coverage` + `pnpm -r typecheck` + `pnpm build`) | Full suite with coverage thresholds enforced + type check + build               | Guards `main`; coverage threshold gate catches "covered by line, not by branch" regressions; build step catches import errors that tsc alone misses |
| **Pre-release**                                                             | Manual golden-path checklist in two browsers (one desktop, one mobile viewport) | Confirms the integrated system works end-to-end with a real network and a real browser; Playwright E2E is a Phase-2 follow-on (see §7)              |

**Layer-to-stage mapping:**

- **Unit tests** run at every stage (inner loop through CI). They're fast (< 1 s for the full `packages/core` unit set) and give the earliest signal.
- **Integration tests** run from pre-commit onward. They take slightly longer (server module setup) but are still well within the pre-commit budget.
- **Behavioural DOM tests** run from pre-commit onward. happy-dom spins up in ~1.4 s and the hook tests themselves run in < 100 ms, so the total is acceptable in a pre-commit hook.
- **Manual E2E** runs pre-release only. It requires a running server and two browser instances, making it impractical for every commit.

---

## 5. Key Testing Decisions

### TDD discipline — tests written before implementation for core logic

Every module in `packages/core/src/core` was developed test-first: a failing test was written, the implementation was added, then the code was refactored. The commit history (search for `EX2: add tests for`) reflects this order. The benefit is twofold: the test defines the public contract before the implementation can bias it, and coverage is structural rather than retrofitted.

### Clock and RNG are injected, never globally mocked

`Date.now()` and `Math.random()` are never called directly in production code — both flow through `Clock` and `Rng` interfaces. Tests inject `makeFakeClock()` and `makeSeededRng(seed)` instead of using `vi.spyOn(Date, "now")`. This means the 3000 ms reflex-bonus boundary can be tested exactly (`timeTakenMs: 3000` vs `3001`) without coordinating fake timers, and the turn-order decision is reproducible across any environment.

Example: `scoring.test.ts` tests the reflex boundary at exactly `DEFAULT_ELITE_CONFIG.reflexWindowMs` and `reflexWindowMs + 1` — no timer manipulation required.

### `vi.useFakeTimers()` only where real `setTimeout` is used

Fake timers are used in exactly two places: `turn-timer.test.ts` (the TurnTimer class drives `setTimeout` directly) and `useWebSocket.test.ts` / `GameProvider.test.tsx` (reconnect backoff uses `setTimeout`). In both cases `vi.useRealTimers()` is restored in `afterEach`. Elsewhere, tests are fully synchronous.

### Mocks only at system boundaries with a stated reason

Two system boundaries warrant mocking:

1. **Browser `WebSocket`** in `useWebSocket.test.ts` and `GameProvider.test.tsx`: Node has no `WebSocket` global; a mock is the only way to simulate the lifecycle in a non-browser environment. The mock exposes `simulateOpen()`, `simulateClose()`, `simulateError()`, `simulateMessage()` methods that drive the hook state machine.
2. **Next.js `NextResponse`** in `errors.test.ts`: the `next/server` module is a build-time singleton that doesn't resolve cleanly in Vitest's Node environment. The mock is declared at the top of the test file with `vi.mock("next/server", ...)` and documents that reason.

No other internal module is mocked. Specifically, `processShot`, `handleTurnTimeout`, `placeFleet`, and all domain functions are called with real production implementations.

### Execution-order independence

Every `it()` block constructs its own state using public factory functions (`createGame`, `addSecondPlayer`, `placeFleet`, `buildPlayingScenario()`). Singleton modules (`GameRegistry`, `WebSocketHub`, `LobbyEmitter`) are reset in `beforeEach` via their `__reset*ForTests()` helpers. No test relies on state left by a previous test.

### No redundant tests

A test exists because it pins a specific invariant or edge case that would be silently broken by a code change. For example, `game.test.ts` tests `processShot` with a floor-at-zero scenario to confirm the floor is applied at the game layer (not scoring layer). This is not redundant with `scoring.test.ts`'s miss penalty test — the two tests pin different layers of the system.

---

## 6. Coverage Results

Results captured from `pnpm -r test:coverage` immediately after all test files were written.

### `packages/core` (thresholds: 95 stmt / 90 branch / 95 fn / 95 lines)

| Metric     | Actual | Threshold | Status |
| ---------- | ------ | --------- | ------ |
| Statements | 98.54% | 95%       | PASS   |
| Branches   | 95.25% | 90%       | PASS   |
| Functions  | 100%   | 95%       | PASS   |
| Lines      | 98.54% | 95%       | PASS   |

Notable uncovered paths (all intentional):

- `dto.ts` lines 116–121: defensive `never` branch in an exhaustive switch — TypeScript guarantees it cannot be reached at runtime.
- `game.ts` lines 87–91, 115–119, 122–123: guard paths that fire only when the caller passes a malformed state object, which cannot happen through the public API.
- `scoring.ts` line 94: a branch inside `EliteStrategy` that handles a `reflexMultiplier` value of exactly 1 — theoretically reachable but requires a config override not exercised by the test helpers.
- `handlers.ts` lines 117, 134, 139 / `hub.ts` lines 39, 62, 81: branch arms that handle undefined intermediate values in the WebSocket protocol path — the fakes used in integration tests are stricter than a real WS runtime, so these arms are intentionally never exercised.

### `apps/web` (thresholds: 80 stmt / 75 branch / 80 fn / 80 lines)

| Metric     | Actual | Threshold | Status |
| ---------- | ------ | --------- | ------ |
| Statements | 96.39% | 80%       | PASS   |
| Branches   | 88.41% | 75%       | PASS   |
| Functions  | 95.65% | 80%       | PASS   |
| Lines      | 96.39% | 80%       | PASS   |

Notable uncovered paths:

- `playerSession.ts` lines 24–29: `sessionStorage` exception path — browsers throttle storage writes when storage is full; this path is platform-specific and not reachable in happy-dom without deep internals stubbing.
- `GameProvider.tsx` lines 58–59, 75, 80: WebSocket reconnect backoff arms and the `onerror` handler — the mock WebSocket used in tests exposes lifecycle controls but does not simulate all edge-case sequences; the branches are documented as acceptable gaps.
- `useWebSocket.ts` lines 38, 48, 53: similar WebSocket lifecycle branches.
- `useShotFeedback.ts` lines 7, 12: `Audio` constructor branches for `autoplay` policy rejection — the stubbed `Audio.play()` always resolves, so the rejection path cannot be triggered without replacing the stub.

---

## 7. Known Gaps & Follow-ons

### React component rendering (Board, ShipPalette, HUD)

Testing CSS Modules + Tailwind class output adds almost no signal — it produces tests that assert on implementation details (class names) rather than user-visible behavior. These components are visually verified in the browser during development and will be covered in Playwright E2E.

### Real WebSocket end-to-end against `server.ts`

The integration tests in `packages/core/src/server/__tests__/handlers.test.ts` exercise the handler logic with an in-memory registry and hub. They do not start a real HTTP server or establish real WebSocket connections. A full end-to-end test requiring a live server and real network is the Playwright layer.

### Playwright E2E (Phase 2)

The manual pre-release checklist covers:

1. Two players join the same game (host creates, guest joins via shared link).
2. Both players place their fleets successfully.
3. Turn timer counts down and auto-advances on expiry.
4. All three game modes complete a full game cycle.
5. One player disconnects mid-game and reconnects.
6. Mobile viewport: drag-and-drop fleet placement, touch-friendly shot targeting.

Automating this with Playwright is the next step after the current exercises are delivered.

### CI pipeline

No `.github/workflows` configuration is included in the current deliverable. The recommended CI job is: `pnpm install → pnpm -r lint → pnpm -r typecheck → pnpm -r test:coverage → pnpm build`. Coverage threshold enforcement is handled by Vitest's built-in threshold config, so no external tool is needed.
