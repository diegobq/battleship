# Workspace Split: `packages/core` + `apps/web`

## Goal

Restructure the flat monorepo into two pnpm workspaces following the [Turborepo convention](https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository):
- **`packages/core`** — framework-agnostic library (`@battleship/core`)
- **`apps/web`** — Next.js application that consumes it (`@battleship/web`)

This is a **pure restructure** — zero behaviour changes, all 176 existing tests must pass afterwards.

---

## Naming Rationale

The previous plan used `server/` and `client/`. That's misleading because:
- The "server" package is a library — it never binds a port
- The "client" package runs the actual HTTP + WebSocket server

The industry-standard convention (Turborepo, Nx, moon) is:

| Directory | Purpose | Package name |
|---|---|---|
| `packages/<name>` | Shared libraries, consumed via `workspace:*` | `@battleship/core` |
| `apps/<name>` | Runnable applications (Next.js, Vite, etc.) | `@battleship/web` |

---

## Target Layout

```
/
├── package.json                    # root — orchestration scripts only
├── pnpm-workspace.yaml             # packages: ['packages/*', 'apps/*']
├── tsconfig.base.json              # shared compiler options
├── eslint.config.mjs               # shared (unchanged, stays at root)
├── packages/
│   └── core/                       # @battleship/core
│       ├── package.json
│       ├── tsconfig.json           # extends ../../tsconfig.base.json
│       ├── vitest.config.ts
│       └── src/
│           ├── core/               # ← from lib/core/
│           │   ├── { types, clock, rng, fleet, board, scoring, rules, game }.ts
│           │   └── __tests__/
│           ├── server/             # ← from lib/server/
│           │   ├── { registry, ids, turn-timer }.ts
│           │   ├── ws/{ protocol, hub, handlers }.ts
│           │   └── __tests__/
│           ├── api/                # ← from lib/api/
│           │   ├── { dto, errors }.ts
│           │   └── __tests__/
│           └── index.ts            # barrel re-export
│
└── apps/
    └── web/                        # @battleship/web — Next.js app
        ├── package.json            # depends on @battleship/core (workspace:*)
        ├── tsconfig.json           # extends ../../tsconfig.base.json
        ├── vitest.config.ts
        ├── next.config.ts
        ├── postcss.config.mjs
        ├── server.ts               # ← from /server.ts
        ├── app/                    # ← from /app/
        │   ├── layout.tsx, page.tsx, globals.css
        │   ├── _theme/, _components/
        │   ├── new/, game/[gameId]/
        │   └── api/{ games, game/create, game/join }/route.ts
        └── lib/
            └── ui/                 # ← from /lib/ui/
                ├── { GameProvider, useWebSocket, placementReducer, playerSession }.{ts,tsx}
                └── __tests__/
```

---

## What Moves Where

| Current path | New path | Stays in |
|---|---|---|
| `lib/core/**` | `packages/core/src/core/**` | `@battleship/core` |
| `lib/server/**` | `packages/core/src/server/**` | `@battleship/core` |
| `lib/api/**` | `packages/core/src/api/**` | `@battleship/core` |
| `lib/ui/**` | `apps/web/lib/ui/**` | `@battleship/web` |
| `app/**` | `apps/web/app/**` | `@battleship/web` |
| `server.ts` | `apps/web/server.ts` | `@battleship/web` |
| `next.config.ts` | `apps/web/next.config.ts` | `@battleship/web` |
| `postcss.config.mjs` | `apps/web/postcss.config.mjs` | `@battleship/web` |
| `next-env.d.ts` | `apps/web/next-env.d.ts` | `@battleship/web` |
| `public/**` | `apps/web/public/**` | `@battleship/web` |

---

## Import Rewrite Rules

### Inside `packages/core/src/`

All `@/lib/core/...` and `@/lib/server/...` and `@/lib/api/...` become `@/...` paths (alias remapped to `./src/`):

```diff
-import { GameState } from '@/lib/core/types';
+import { GameState } from '@/core/types';

-import { registry } from '@/lib/server/registry';
+import { registry } from '@/server/registry';
```

~21 import lines to update (the grep results above show all of them).

### Inside `apps/web/`

Imports from `lib/core`, `lib/server`, `lib/api` → `@battleship/core`:

```diff
-import { GameState } from '@/lib/core/types';
+import { GameState } from '@battleship/core';

-import { registry } from '@/lib/server/registry';
+import { registry } from '@battleship/core';
```

Imports from `lib/ui` stay as `@/lib/ui/...` (alias remaps to `apps/web/`):

```diff
 // unchanged
 import { useGame } from '@/lib/ui/GameProvider';
```

~32 import lines to update in `apps/web/`.

### `packages/core/src/index.ts` barrel

```ts
// Core domain
export * from './core/types';
export * from './core/clock';
export * from './core/rng';
export * from './core/fleet';
export * from './core/board';
export * from './core/scoring';
export * from './core/rules';
export * from './core/game';

// Server utilities
export * from './server/registry';
export * from './server/ids';
export * from './server/turn-timer';
export * from './server/ws/protocol';
export * from './server/ws/hub';
export * from './server/ws/handlers';

// API helpers
export * from './api/dto';
export * from './api/errors';
```

### `packages/core/package.json` exports map

```json
{
  "name": "@battleship/core",
  "exports": {
    ".": "./src/index.ts",
    "./core/*": "./src/core/*.ts",
    "./server/*": "./src/server/*.ts",
    "./api/*": "./src/api/*.ts"
  }
}
```

> [!NOTE]
> The barrel + subpath exports gives consumers a choice: `import { GameState } from '@battleship/core'` for convenience, or `import { GameState } from '@battleship/core/core/types'` for tree-shaking precision. Both work.

---

## Config Files

### Root `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'apps/*'

allowBuilds:
  esbuild: true
  sharp: true
  unrs-resolver: true
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

### Root `package.json` (orchestration only)

```json
{
  "name": "diego-bevaqua-asse-20260519",
  "private": true,
  "scripts": {
    "dev":           "pnpm --filter @battleship/web dev",
    "build":         "pnpm --filter @battleship/web build",
    "start":         "pnpm --filter @battleship/web start",
    "lint":          "pnpm -r lint",
    "test":          "pnpm -r test",
    "test:watch":    "pnpm -r test:watch",
    "test:coverage": "pnpm -r test:coverage"
  }
}
```

### Root `tsconfig.base.json` (NEW)

Extracted shared compiler options from the current `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true
  }
}
```

### `packages/core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    "incremental": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### `packages/core/vitest.config.ts`

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
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts', 'src/core/types.ts', 'src/index.ts'],
    },
  },
});
```

### `apps/web/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': rootDir } },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.{ts,tsx}'],
      exclude: ['lib/**/__tests__/**', 'lib/**/*.d.ts'],
    },
  },
});
```

---

## Dependency Split

### `packages/core/package.json`

```json
{
  "name": "@battleship/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./core/*": "./src/core/*.ts",
    "./server/*": "./src/server/*.ts",
    "./api/*": "./src/api/*.ts"
  },
  "scripts": {
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:coverage": "vitest run --coverage",
    "lint":          "eslint src/",
    "typecheck":     "tsc --noEmit"
  },
  "dependencies": {
    "ws": "^8.20.0"
  },
  "devDependencies": {
    "@types/ws": "^8.18.1",
    "@vitest/coverage-v8": "^2.1.9",
    "typescript": "^5",
    "vitest": "^2.1.9"
  }
}
```

### `apps/web/package.json`

```json
{
  "name": "@battleship/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev":           "tsx server.ts",
    "build":         "next build",
    "start":         "NODE_ENV=production tsx server.ts",
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:coverage": "vitest run --coverage",
    "lint":          "eslint app/ lib/",
    "typecheck":     "tsc --noEmit"
  },
  "dependencies": {
    "@battleship/core": "workspace:*",
    "next": "16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "ws": "^8.20.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/ws": "^8.18.1",
    "@vitest/coverage-v8": "^2.1.9",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5",
    "vitest": "^2.1.9"
  }
}
```

> [!IMPORTANT]
> `ws` appears in both workspaces because `packages/core` exports modules that use `ws` types (hub, handlers) and `apps/web/server.ts` directly instantiates `WebSocketServer`. pnpm deduplicates the actual install.

---



## User Review Required

> [!IMPORTANT]
> **The ESLint config stays at root** — `eslint-config-next` has tight assumptions about project structure. Each workspace's `lint` script targets its own directories (`eslint src/` vs `eslint app/ lib/`), but they all resolve the root `eslint.config.mjs`. This avoids duplicating the config and keeps it simple. Happy with this approach?

> [!NOTE]
> **Docker/deployment files** (`Dockerfile`, `docker-entrypoint.js`, `fly.toml`) are **not touched** by this restructure. They'll need updating before the next deploy, but that's out of scope here.

---

## Execution Order

All steps are atomic commits with the `EX2:` prefix. Every step ends on green (`pnpm test` passes).

### Phase 1 — Scaffold (no file moves yet)

1. **`EX2: add tsconfig.base.json and pnpm workspace config`**
   - Create `tsconfig.base.json` at root
   - Update `pnpm-workspace.yaml` to declare `packages/*` and `apps/*`
   - Create empty `packages/core/package.json` and `apps/web/package.json`

### Phase 2 — Move `packages/core`

2. **`EX2: move core/server/api into @battleship/core workspace`**
   - `git mv lib/core → packages/core/src/core`
   - `git mv lib/server → packages/core/src/server`
   - `git mv lib/api → packages/core/src/api`
   - Create `packages/core/src/index.ts` barrel
   - Create `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`
   - Rewrite internal imports (`@/lib/core/...` → `@/core/...`, etc.)
   - Verify: `pnpm --filter @battleship/core test` passes (all ~120 existing tests)

### Phase 3 — Move `apps/web`

3. **`EX2: move Next.js app into @battleship/web workspace`**
   - `git mv app → apps/web/app`
   - `git mv lib/ui → apps/web/lib/ui`
   - `git mv server.ts → apps/web/server.ts`
   - `git mv next.config.ts, postcss.config.mjs, next-env.d.ts, public → apps/web/`
   - Create `apps/web/tsconfig.json`, `apps/web/vitest.config.ts`
   - Add `"@battleship/core": "workspace:*"` dependency
   - Rewrite imports: `@/lib/core/...` → `@battleship/core`, `@/lib/server/...` → `@battleship/core`, etc.
   - Verify: `pnpm --filter @battleship/web test` passes (ui tests), `pnpm dev` starts

### Phase 4 — Wire root + cleanup

4. **`EX2: wire root orchestration scripts and clean up`**
   - Update root `package.json` to orchestration-only scripts
   - Delete old root `vitest.config.ts`, `tsconfig.json` (replaced by `tsconfig.base.json`)
   - Clean up now-empty `lib/` directory
   - Verify: `pnpm test`, `pnpm dev`, `pnpm build` all work from root

---

## Verification Plan

### Automated
- `pnpm install` — workspace links resolve correctly
- `pnpm --filter @battleship/core test` — all core/server/api tests pass
- `pnpm --filter @battleship/web test` — all UI tests pass
- `pnpm test` — runs both workspaces
- `pnpm lint` — clean across both workspaces
- `pnpm build` — Next.js production build succeeds

### Manual
- `pnpm dev` → open http://localhost:3000 → create game → verify pages render and WebSocket connects
