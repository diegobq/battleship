# Exercise 2: Testing Strategy + Workspace Split — Implementation Plan

## Context

Exercise 2 of the ASSE Battleship assessment asks for: (1) a **comprehensive test suite** for the Ex1 core, (2) **full coverage of business cases**, and (3) a **`SOLUTION-2.md`** documenting the testing strategy — including which test types run at which step of the dev cycle.

The user added three constraints on top of the spec:
1. **Split the codebase into two pnpm workspaces** named `server` and `client`.
2. **Aspirational 100% coverage in both workspaces** — thresholds set to ≥99% (lines/functions/statements) and ≥95% (branches), with `/* v8 ignore next */` for truly unreachable defensive paths.
3. **Four root-level test scripts:** `test`, `test:coverage`, `test:server`, `test:client`.
4. Every requirement from `docs/exercises/ex2.md` must be explicitly mapped in `SOLUTION-2.md`.

**Current state (verified):** 176 passing tests in one monorepo. `lib/core/**` is ~99% covered; `lib/server/ws/{hub,handlers}.ts`, `lib/server/ids.ts`, `lib/api/errors.ts` (partially), `app/api/**/route.ts`, and `lib/ui/{GameProvider, useWebSocket, playerSession}.tsx` are at 0%.

Outcome: monorepo restructured into `server/` (non-runnable library workspace) + `client/` (Next.js app workspace, depends on `server`), each with its own vitest config and a ≥99% coverage gate. The web-integration gap is closed with ~70 new tests. `SOLUTION-2.md` traces every Ex2 spec line to its implementation and documents the dev-cycle stages.

---

## Workspace Shape

```
/
├── package.json                        # root — orchestration scripts only
├── pnpm-workspace.yaml                 # packages: ['server', 'client']
├── tsconfig.base.json                  # shared compiler options
├── server/                             # @battleship/server — non-runnable library
│   ├── package.json                    # name, scripts (test, test:coverage, lint, typecheck)
│   ├── tsconfig.json                   # extends base; paths: { "@/*": ["./src/*"] }
│   ├── vitest.config.ts                # env=node, threshold ≥99/95/99/99
│   └── src/
│       ├── core/                       # ← from lib/core/
│       │   ├── { types, clock, rng, fleet, board, scoring, rules, game }.ts
│       │   └── __tests__/              # 110 existing core tests, unchanged content
│       ├── server/                     # ← from lib/server/
│       │   ├── { registry, ids, turn-timer }.ts
│       │   ├── ws/{ protocol, hub, handlers }.ts
│       │   └── __tests__/              # registry, turn-timer, protocol + new: hub, handlers, ids
│       ├── api/                        # ← from lib/api/
│       │   ├── { dto, errors }.ts
│       │   └── __tests__/              # dto + new: errors
│       └── index.ts                    # barrel: re-exports for cross-workspace consumers
│
└── client/                             # @battleship/client — Next.js app
    ├── package.json                    # name, dependencies on @battleship/server (workspace:*)
    ├── tsconfig.json                   # extends base; paths: { "@/*": ["./*"] }
    ├── vitest.config.ts                # env=node default, jsdom for ui/components
    ├── next.config.ts                  # (kept as-is if any)
    ├── server.ts                       # ← from /server.ts (custom Next + ws entry, uses @battleship/server)
    ├── app/                            # ← from /app/ (pages + api routes)
    │   ├── { layout, globals.css, page }.tsx
    │   ├── _theme/christmas.css
    │   ├── _components/
    │   ├── new/page.tsx
    │   ├── game/[gameId]/page.tsx
    │   ├── api/                        # route handlers, import from @battleship/server
    │   │   ├── games/route.ts
    │   │   └── game/{ create, join }/route.ts
    │   └── __tests__/                  # new: route tests (node env)
    └── lib/
        ├── ui/                         # ← from /lib/ui/
        │   ├── { GameProvider, useWebSocket, placementReducer, playerSession }.{ts,tsx}
        │   └── __tests__/              # placementReducer + new: GameProvider, useWebSocket, playerSession
        └── ui/__tests__/testUtils/     # MockWebSocket shared helper
```

**Why this shape:** Next.js requires all routes + pages inside one `app/` directory, so the Next.js application stays whole — that's the `client` workspace. Everything that has no React/Next dependency is pulled out into the `server` workspace as a library, which the `client`'s API routes and custom `server.ts` consume via the `@battleship/server` package alias. The `server` workspace is independently testable in pure Node, no Next imports.

---

## Migration Steps

### 1. Filesystem moves
- `lib/core/`        → `server/src/core/`
- `lib/server/`      → `server/src/server/`
- `lib/api/`         → `server/src/api/`
- `lib/ui/`          → `client/lib/ui/`
- `app/`             → `client/app/`
- `server.ts`        → `client/server.ts`
- `vitest.config.ts` → split into `server/vitest.config.ts` + `client/vitest.config.ts`
- `tsconfig.json`    → split into `tsconfig.base.json` (root) + per-workspace tsconfigs

### 2. Import path rewrites
- **Inside `server/src/`**: replace `@/lib/core/...` → `@/core/...` (alias remapped to `./src/`), and `@/lib/server/...` → `@/server/...`. Internal cross-module imports may stay relative where adjacent.
- **Inside `client/`**: replace `@/lib/core/...` and `@/lib/server/...` and `@/lib/api/...` → `@battleship/server` (or the relevant subpath via `@battleship/server/core`, etc., via the package's `exports` map).
- **Inside `client/`**: `@/lib/ui/...` stays (now resolves to `client/lib/ui/...`); `@/app/_components/...` stays.

### 3. `server/src/index.ts` barrel
Re-exports the public surface the client needs:

```ts
export * from './core/types';
export * from './core/clock';
export * from './core/rng';
export * from './core/fleet';
export * from './core/board';
export * from './core/scoring';
export * from './core/rules';
export * from './core/game';
export * from './server/registry';
export * from './server/ids';
export * from './server/turn-timer';
export * from './server/ws/protocol';
export * from './server/ws/hub';
export * from './server/ws/handlers';
export * from './api/dto';
export * from './api/errors';
```

Plus `server/package.json` `exports` map to allow deep paths if preferred:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./core/*": "./src/core/*.ts",
    "./server/*": "./src/server/*.ts",
    "./api/*": "./src/api/*.ts"
  }
}
```

### 4. Root `pnpm-workspace.yaml`
```yaml
packages:
  - server
  - client
```

### 5. Root `package.json` scripts
```json
"scripts": {
  "dev":            "pnpm --filter @battleship/client dev",
  "build":          "pnpm --filter @battleship/client build",
  "start":          "pnpm --filter @battleship/client start",
  "lint":           "pnpm -r lint",
  "test":           "pnpm -r test",
  "test:coverage":  "pnpm -r test:coverage",
  "test:server":    "pnpm --filter @battleship/server test:coverage",
  "test:client":    "pnpm --filter @battleship/client test:coverage"
}
```

Per-workspace `package.json` scripts:
```json
"scripts": {
  "test":          "vitest run",
  "test:watch":    "vitest",
  "test:coverage": "vitest run --coverage",
  "lint":          "eslint .",
  "typecheck":     "tsc --noEmit"
}
```

---

## Tests to Add (to reach ≥99%)

### `server/` workspace (Node env)

**`server/src/server/__tests__/hub.test.ts`** (~12 tests)
- `register` adds a connection.
- Duplicate register closes the previous socket with code 4000.
- `unregister` removes the connection; empty game gets pruned.
- `sendTo` returns `false` for unknown player; `true` when present, calls `socket.send`.
- `sendTo` skips when `readyState !== OPEN`.
- `broadcast` invokes factory for every connected player.
- `broadcast` passes `playerId` so per-recipient payloads can differ.
- `broadcastState` runs `sanitizeGameStateFor` per recipient.
- `isOnline` reflects registration state.
- `getHub` returns a singleton; `__resetHubForTests` produces a fresh one.
- Mock `HubSocket`: tiny `{ send: vi.fn(), close: vi.fn(), readyState: 1 }`.

**`server/src/server/__tests__/handlers.test.ts`** (~15 tests; real registry + hub + mock sockets + `vi.useFakeTimers()`)
- PING → PONG to sender only.
- PLACE_FLEET happy path: state update broadcast; both ready triggers `playing` + scheduled timer.
- PLACE_FLEET ship-count mismatch → ERROR to sender only.
- PLACE_FLEET unknown game → ERROR `GAME_NOT_FOUND`.
- SHOOT valid hit: timer cancel + registry update + SHOT_RESULT + GAME_STATE_UPDATE + new timer scheduled.
- SHOOT valid miss: same broadcast sequence; streak resets in state.
- SHOOT out-of-turn → ERROR `WRONG_TURN` to shooter; no broadcast; no timer change.
- SHOOT already-shot cell → ERROR `ALREADY_SHOT`.
- SHOOT out-of-bounds → ERROR `OUT_OF_BOUNDS`.
- SHOOT that ends the game → `gameOver=true`; no new timer.
- Turn-timer elapse → broadcasts `TURN_TIMEOUT` + state; flips active player; schedules new timer.
- Unhandled internal error in shoot handler → ERROR `INTERNAL`; original logged.
- Sanitised state across recipients: shooter sees ships; opponent sees redacted opponent grid.

**`server/src/server/__tests__/ids.test.ts`** (~3 tests)
- `newGameId` returns 8-char hex string.
- `newPlayerId` returns a UUID v4 string.
- 1 000 calls of each yield no duplicates.

**`server/src/api/__tests__/errors.test.ts`** (~4 tests)
- `apiErrorResponse(ApiError(400, 'X', 'msg'))` → body `{ error: { code: 'X', message: 'msg' } }`, status 400.
- `handleApiError(ApiError)` delegates to `apiErrorResponse`.
- `handleApiError(new Error('boom'))` returns generic 500 INTERNAL — does not leak the inner message.
- `handleApiError('string')` (non-Error) still returns the safe 500 envelope.

### `client/` workspace

**`client/app/api/__tests__/routes.test.ts`** (~12 tests, **Node env** via `environmentMatchGlobs`)
- Use `new Request(url, { method, headers, body })`; call route's exported `GET`/`POST`; assert on returned `NextResponse`.
- `beforeEach(__resetRegistryForTests())`.
- GET `/api/games` empty list.
- GET `/api/games` filters to status='lobby' with <2 players.
- POST `/api/game/create` happy: registry seeded; 200 with `{ gameId, playerId }`.
- POST `/api/game/create` bad mode → 400 BAD_REQUEST.
- POST `/api/game/create` malformed JSON body → 400 BAD_REQUEST.
- POST `/api/game/create` defaults (no `fleet`/`turnTimerMs`) → DEFAULT_FLEET_CONFIG + 60_000.
- POST `/api/game/join` unknown gameId → 404 GAME_NOT_FOUND.
- POST `/api/game/join` non-lobby game → 409 GAME_NOT_JOINABLE.
- POST `/api/game/join` happy: game transitions to placement; second player has fleet built.

**`client/lib/ui/__tests__/useWebSocket.test.tsx`** (~8 tests; **jsdom**)
- `MockWebSocket` global replaces `globalThis.WebSocket` per test; restored in `afterEach`.
- Initial state `'connecting'` when url provided; `'idle'` when null.
- On open, state → `'open'`; reconnect counter resets.
- Incoming message invokes `onMessage` with payload string.
- `send` returns `true` after open; `false` before open.
- On close, schedules reconnect with exponential backoff (`vi.useFakeTimers()`). Caps at `maxReconnects`.
- Unmount aborts pending reconnect; final `close` issued.
- Changing `url` triggers fresh connection.

**`client/lib/ui/__tests__/GameProvider.test.tsx`** (~10 tests; **jsdom**)
- Render `<GameProvider gameId="g" playerId="p">` with a probe component reading `useGame()`.
- `GAME_STATE_UPDATE` message sets `state`.
- `SHOT_RESULT` sets `lastShot` with monotonic `at` timestamp.
- `TURN_TIMEOUT` sets `turnExpiredPlayerId`; auto-clears after 2_000 ms.
- `ERROR` sets `errorMessage`; `dismissError()` clears it.
- `placeFleet(ps)` emits `{type:'PLACE_FLEET', payload:{placements: ps}}` JSON.
- `shoot(r, c)` emits `{type:'SHOOT', payload:{r, c}}` JSON.
- `connection` derives from underlying WS state.
- Malformed JSON in incoming message is logged and ignored.
- `useGame()` outside provider throws.

**`client/lib/ui/__tests__/playerSession.test.ts`** (~3 tests; **jsdom**)
- `setPlayerId` + `getPlayerId` round-trip via `sessionStorage`.
- `clearPlayerId` removes the entry.
- `usePlayerId(gameId)` returns the stored value via `useSyncExternalStore`.

---

## Vitest Configs

### `server/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': `${rootDir}src` } },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts', 'src/core/types.ts', 'src/index.ts'],
      thresholds: { lines: 99, functions: 99, branches: 95, statements: 99 },
    },
  },
});
```

### `client/vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': rootDir } },
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['lib/ui/**', 'jsdom'],
      ['app/_components/**', 'jsdom'],
      ['app/api/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/**/*.{ts,tsx}', 'lib/ui/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**',
        '**/*.d.ts',
        'server.ts',                // composition root, verified by manual golden path
        'app/layout.tsx',           // trivial root layout
        'app/globals.css',
        'app/_theme/**',
      ],
      thresholds: { lines: 99, functions: 99, branches: 95, statements: 99 },
    },
  },
});
```

### Deliberate exclusions (documented in SOLUTION-2.md)
- `server.ts` — Next.js + ws wiring; correctness verified by manual smoke and end-to-end through routes/handlers tests.
- `app/layout.tsx`, `app/globals.css`, `app/_theme/**` — trivial / CSS.
- `src/core/types.ts`, `src/index.ts` — type-only / barrel.

### Aspirational 100% strategy
- Default thresholds at 99/95/99/99 give a 1 % safety margin without rounding to 100.
- For lines that are *truly* unreachable in normal operation (e.g. `default` arms of exhaustive `switch` over union types, defensive `throw` after a previous guard), prefix with `/* v8 ignore next */`. Each such annotation must be paired with a comment explaining *why* it's unreachable. The PR review checks every annotation.

---

## New devDependencies
- `@testing-library/react` — `renderHook`, `render` for hooks and provider.
- `@testing-library/jest-dom` — DOM matchers (optional).
- `jsdom` — vitest browser-like env for UI.

Added to `client/`'s `devDependencies`.

---

## SOLUTION-2.md outline (every Ex2 requirement traced)

The file is structured so each section explicitly responds to a sentence from `docs/exercises/ex2.md`.

1. **Goal statement** — quoted from ex2.md, restated in our own words.
2. **Working test suite (Deliverable 1)** — workspace layout; total test count by workspace; how to run each script.
3. **Comprehensive coverage (Ex2 point 1)** — test pyramid (unit, integration, manual E2E); concrete files per layer; mocking strategy with rationale.
4. **Coverage policy (Ex2 point 2 - "Full Coverage")** — actual numbers from `pnpm test:coverage` per workspace; threshold values; what is excluded and why.
5. **Business cases catalogue** — table mapping every spec rule (placement valid/invalid, hit/miss, sunk, game-over, three modes, accuracy bonus, streak multipliers, reflex bonus at 3000 ms, miss penalty floor, turn alternation, turn timeout, dice-roll determinism, lobby filtering, sanitisation, ID uniqueness) to the test file + `it()` name that asserts it.
6. **Dev-cycle stages (Ex2 point 2 - "Specify in which step…")** — per test type:
   - **Pre-commit (developer machine):** `pnpm lint` + `pnpm test`. TDD pairs failing test → impl → green per commit (CLAUDE.md rule).
   - **CI on push / PR:** `pnpm test:coverage` (both workspaces) gating merge; `pnpm typecheck`; `pnpm build` to verify production bundle compiles.
   - **Pre-release / nightly:** full suite + manual golden path on `pnpm dev` with two browser tabs (placement, play, reconnect, Christmas-skin override).
   - **Post-deploy smoke:** liveness check on the home + lobby endpoints (out of scope here, flagged for production).
7. **Testing utilities & rationale** — vitest (speed, vi.useFakeTimers, environmentMatchGlobs); @testing-library/react (renderHook for context tests); MockWebSocket / MockSocket hand-rolled (no over-engineered libs).
8. **Determinism principles** — Clock/Rng injection from Ex1 preserved; no mocks of `Date.now`/`Math.random`; FakeClock used for reflex-bonus boundary at exactly 3000 ms.
9. **What is deliberately NOT tested** — `server.ts` (manual smoke), CSS files, visual rendering of components (RTL component tests skipped; cost > confidence gained given the simple, mostly-presentational UI).
10. **Future test additions** — Playwright browser E2E, fuzz testing of `parseClientMessage`, load testing the WebSocket hub.

---

## Order of Work (atomic commits, `EX2:` prefix)

**Phase A — Restructure (must land first, no behaviour change)**
1. `EX2: bootstrap pnpm workspaces (root pkg + workspace.yaml + tsconfig.base)` — root package.json scripts, pnpm-workspace.yaml, tsconfig.base.json. No code moved yet.
2. `EX2: move core/server/api into @battleship/server workspace` — move `lib/core/`, `lib/server/`, `lib/api/` → `server/src/`. Add `server/package.json` + `server/tsconfig.json` + `server/vitest.config.ts`. Update internal imports. Existing tests still pass under `pnpm --filter @battleship/server test`.
3. `EX2: move next app into @battleship/client workspace` — move `app/`, `lib/ui/`, `server.ts` → `client/`. Add `client/package.json` with workspace dep on `@battleship/server`. Update cross-package imports (`@/lib/core/...` → `@battleship/server` or subpath). `pnpm dev` still works.
4. `EX2: wire root orchestration scripts` — `test`, `test:coverage`, `test:server`, `test:client`, `dev`, `build`, `start`. Verify each.

**Phase B — Fill coverage gaps**
5. `EX2: install jsdom + testing-library and enable thresholds` — add to `client/devDependencies`; finalize both `vitest.config.ts` files with threshold and `environmentMatchGlobs`.
6. `EX2: test websocket hub` — `server/src/server/__tests__/hub.test.ts`.
7. `EX2: test websocket handlers` — `server/src/server/__tests__/handlers.test.ts`.
8. `EX2: test ids and api error mapping` — `server/src/server/__tests__/ids.test.ts`, `server/src/api/__tests__/errors.test.ts`.
9. `EX2: test REST route handlers` — `client/app/api/__tests__/routes.test.ts`.
10. `EX2: test useWebSocket hook` — `client/lib/ui/__tests__/useWebSocket.test.tsx` + `MockWebSocket` helper.
11. `EX2: test GameProvider context` — `client/lib/ui/__tests__/GameProvider.test.tsx`.
12. `EX2: test player session helpers` — `client/lib/ui/__tests__/playerSession.test.ts`.
13. `EX2: push to ≥99% — annotate truly unreachable paths` — add `/* v8 ignore next */` with rationale comments where required; chase remaining branches.

**Phase C — Documentation**
14. `EX2: docs - SOLUTION-2.md` (separate commit per CLAUDE.md rule 6).

Run `pnpm lint` + `pnpm test` after each step. Phase A commits MUST end on green (no behaviour changes). Phase B commits ratchet up the threshold as each layer fills in.

---

## Risks & Tradeoffs

| Risk | Mitigation |
|---|---|
| Cross-workspace imports break under tsx / Next module resolution | `server/package.json` exposes both a barrel (`"."`) and subpath `exports`. Verified by running `pnpm dev` after Phase A step 3. |
| Moving `app/` paths breaks Next.js routing | `client/app/` is the only Next.js root after migration; verified by `pnpm build` (or `pnpm dev` smoke). |
| 99 % threshold can fail CI on small drops | Threshold is 99, not 100 — small refactors have a margin. `/* v8 ignore next */` available with mandatory rationale comment. |
| jsdom doesn't implement `WebSocket` | We override `globalThis.WebSocket` with a hand-rolled `MockWebSocket`. Restored in `afterEach`. |
| Fake timers + Promises race | Use `await flushPromises()` helper (`new Promise(r => setImmediate(r))`) where ordering matters. Documented in SOLUTION-2.md. |
| Node version blocks `next build` | Pre-existing issue (Node 20.6.1 vs ≥20.9.0 required). Not caused by this work. Flagged in verification section; user must upgrade Node to run dev/build. |

---

## Critical Files to Modify / Add

**Add (new files)**
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`
- `server/src/index.ts` (barrel)
- `server/src/server/__tests__/{hub,handlers,ids}.test.ts`
- `server/src/api/__tests__/errors.test.ts`
- `client/package.json`, `client/tsconfig.json`, `client/vitest.config.ts`
- `client/app/api/__tests__/routes.test.ts`
- `client/lib/ui/__tests__/{useWebSocket,GameProvider,playerSession}.test.{ts,tsx}`
- `client/lib/ui/__tests__/testUtils/MockWebSocket.ts`
- `SOLUTION-2.md`

**Modify**
- Root `package.json` — replace scripts with workspace orchestration.
- Every file under `lib/{core,server,api,ui}/` and `app/` — moved + import paths rewritten.

**Delete**
- `vitest.config.ts` at repo root (replaced by per-workspace files).

---

## Verification

### Automated
- `pnpm install` (at root) — installs both workspaces, links `@battleship/server` into `@battleship/client`.
- `pnpm test` — runs all tests in both workspaces (~250 total: 176 existing + ~70 new).
- `pnpm test:server` — server workspace tests + coverage; exits 0 with ≥99 % lines/functions, ≥95 % branches.
- `pnpm test:client` — client workspace tests + coverage; exits 0 at the same thresholds.
- `pnpm test:coverage` — runs both, with coverage gate.
- `pnpm lint` — flat ESLint config across both workspaces, clean.
- `pnpm -r typecheck` — `tsc --noEmit` in each workspace, clean.

### Manual golden path (recorded in SOLUTION-2.md)
With `pnpm dev` (running the Next.js app from `client/`, on http://localhost:3000):
1. Tab A → home → Create new game (Elite, default fleet, 60s) → waiting view with shareable Game ID.
2. Tab B → home → lobby list shows the game → Join → both transition to placement.
3. Both tabs place ships → both transition to play.
4. Active tab shoots → both see hit/miss/sunk toasts, score + multiplier update immediately.
5. Active tab idles past `turnTimerMs` → other tab becomes active; expired player's streak resets.
6. Continue until winner → finished screen reveals both boards.
7. Set `<html data-theme="christmas">` in DevTools → UI re-skins instantly with zero component code touched.
8. Reload tab → `sessionStorage` preserves identity; WebSocket reconnects via backoff; state resyncs.
