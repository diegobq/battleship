# Production-Readiness Checklist

> **Scope.** This document enumerates concerns that are **outside** the four assessment exercises but would be required (or strongly recommended) before launching the Battleship game publicly. It is a discussion artifact, not implementation work — items are documented to make awareness explicit.
>
> File references point at `apps/web/` and `packages/core/` (the current monorepo layout).

## Legend

- **P0** — blockers before a public launch (security, data loss, observability blind spots)
- **P1** — required for a polished v1 release (UX, a11y, SEO, CI/CD)
- **P2** — nice-to-haves for future iterations (PWA offline, advanced analytics)

## Table of contents

- [Observability](#observability)
- [Reliability](#reliability)
- [Security](#security)
- [Persistence & Scale](#persistence--scale)
- [Frontend UX](#frontend-ux)
- [Internationalisation](#internationalisation)
- [SEO & Discoverability](#seo--discoverability)
- [PWA & Mobile](#pwa--mobile)
- [Analytics & Consent](#analytics--consent)
- [Performance](#performance)
- [DevOps & CI/CD](#devops--cicd)
- [Code Quality](#code-quality)
- [Compliance & Legal](#compliance--legal)
- [Testing Maturity](#testing-maturity)
- [Configuration](#configuration)
- [Documentation](#documentation)

---

## Observability

- **Structured logging** — **P0**
  - Gap: only ad-hoc `console.log` / `console.error` in `apps/web/server.ts`. No log levels, no JSON output, no request/WS correlation IDs.
  - Impact: incidents in production are unrecoverable without log search. Cannot correlate a player's failed shot with a server error.
  - Approach: adopt `pino` (lowest overhead in Node). Wire a request-scoped logger middleware around the HTTP handler and the WS hub; emit JSON to stdout for the platform's log shipper (Fly.io collects stdout natively).

- **Health & readiness endpoints** — **P0**
  - Gap: no `/health` or `/ready` route. Fly.io health checks currently rely on TCP only.
  - Impact: bad deploys are caught only when a real player connects. No way to gate traffic during boot or shutdown.
  - Approach: add `apps/web/app/api/health/route.ts` (liveness — always 200) and `apps/web/app/api/ready/route.ts` (readiness — checks `GameRegistry` reachability, WS hub init). Wire Fly's `[[http_service.checks]]` to `/ready`.

- **Error tracking** — **P0**
  - Gap: server errors are swallowed by WS `try/catch`; client errors are not reported anywhere.
  - Impact: silent failures in production. The team will not know an error happened until a user reports it.
  - Approach: Sentry SDK on both server (`@sentry/node`) and client (`@sentry/nextjs`). Tag events with `gameId` and `mode`. Sample at 100% initially; tune later.

- **Metrics / tracing** — **P1**
  - Gap: no instrumentation. Time-to-process-action (the KPI called out in SOLUTION-4) is not measured.
  - Impact: cannot prove SLOs (reflex-bonus latency, fan-out latency) or detect regression.
  - Approach: OpenTelemetry SDK + OTLP exporter; instrument WS message handlers, `processShot`, `awardScore`. Export to Grafana Tempo / Datadog / Honeycomb.

- **Event-loop lag monitor** — **P1**
  - Gap: nothing reports event-loop lag (the SOLUTION-4 player-protection KPI).
  - Impact: spectator scaling cannot be validated without this signal.
  - Approach: `@isaacs/event-loop-lag` or `perf_hooks.monitorEventLoopDelay`, exported as a histogram via the metrics path above.

---

## Reliability

- **Graceful shutdown** — **P0**
  - Gap: `apps/web/server.ts` has no `SIGTERM` / `SIGINT` handler. Connections are dropped abruptly on deploy.
  - Impact: in-flight WS messages lost; players see "Connection lost" mid-game on every release.
  - Approach: on `SIGTERM`, stop accepting new WS upgrades, broadcast a `SHUTDOWN_NOTICE` to active sessions, drain for ~10 s, then `server.close()`. Combine with rolling deploys on Fly.io.

- **React error boundary** — **P0**
  - Gap: no boundary wraps the game UI. A render-time exception unmounts the whole app.
  - Impact: a single React error blanks the screen mid-match.
  - Approach: add `apps/web/app/error.tsx` (route-level) and a top-level boundary in `apps/web/app/layout.tsx` rendering a "Something went wrong — return to lobby" fallback. Pipe the error to Sentry.

- **`not-found.tsx`** — **P1**
  - Gap: hitting `/game/{bad-id}` shows the default Next.js 404 chrome.
  - Impact: looks unbranded; no useful next action for the user.
  - Approach: `apps/web/app/not-found.tsx` with a "Back to lobby" CTA; use the same theme tokens.

- **WS reconnect UX** — **P1**
  - Gap: `lib/ui/useWebSocket.ts` retries with backoff but the UI shows no banner during the gap.
  - Impact: a flaky network looks like the game has hung.
  - Approach: surface `WsConnectionState` in a banner toast — "Reconnecting…" then auto-dismiss on success. Pair with the disconnection design in SOLUTION-3.

- **Idempotent client retries** — **P2**
  - Gap: `POST /api/game/create` and `/join` are not idempotent; a double-click could create two games.
  - Impact: lobby noise; orphan games.
  - Approach: accept an `Idempotency-Key` header; cache the response for 5 min.

---

## Security

- **WebSocket origin allowlist** — **P0**
  - Gap: `apps/web/server.ts` upgrades any origin's WS upgrade request.
  - Impact: any third-party site can open a WS, scrape the lobby, or impersonate the client.
  - Approach: validate `Origin` against `ALLOWED_ORIGINS` env var inside the `upgrade` handler; reject with `403` otherwise.

- **Signed player sessions** — **P0**
  - Gap: `playerId` is generated client-side and stored in `sessionStorage` (`apps/web/lib/ui/playerSession.ts`). Anyone can guess/forge a `playerId` and join as another player.
  - Impact: account takeover within a game (low blast radius today — no money, no PII — but blocks any future monetisation).
  - Approach: server mints a signed JWT (or stateless HMAC-SHA256 token) on `POST /create` / `/join`; client passes it in the WS upgrade querystring; server verifies before accepting.

- **Rate limiting** — **P0**
  - Gap: no throttling on REST or WS. A malicious client can flood `SHOOT` messages.
  - Impact: trivial DoS; potential to exhaust the in-memory registry.
  - Approach: token-bucket per `playerId` (e.g. 5 req/s burst, 1 req/s sustained) on REST; per-connection message-rate limit on WS (drop > 10 msg/s).

- **Security headers (CSP, HSTS, X-Frame, Referrer-Policy)** — **P0**
  - Gap: `apps/web/next.config.ts` has no `headers()` block.
  - Impact: XSS reach is unconstrained; clickjacking possible.
  - Approach: add `headers()` returning a strict CSP (`default-src 'self'`, `connect-src 'self' wss:`), `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: ...`.

- **Dependency audit in CI** — **P0**
  - Gap: `pnpm audit` is never run.
  - Impact: known-vulnerable `ws` / `next` / transitive deps ship to prod.
  - Approach: `pnpm audit --prod --audit-level high` step in the CI pipeline; fail on high/critical.

- **CSRF protection** — **P1**
  - Gap: irrelevant today (no cookies, all state is querystring-scoped). Becomes a gap the moment auth uses cookies.
  - Impact: cross-site state-changing requests once sessions are cookie-backed.
  - Approach: SameSite=Lax cookies + double-submit CSRF token if/when auth lands.

- **Input length caps & sanitisation** — **P1**
  - Gap: player names are length-capped at 32 (`packages/core/src/api/dto.ts`) but not Unicode-normalised; emoji and zero-width characters pass through.
  - Impact: spoofed identical-looking names; rendering edge cases.
  - Approach: NFKC-normalise and strip zero-width / RTL-override codepoints before persisting.

---

## Persistence & Scale

- **Redis-backed `GameRegistry`** — **P0**
  - Gap: `packages/core/src/server/registry.ts` is in-memory only. A restart loses every active game.
  - Impact: zero-downtime deploys impossible; multi-instance horizontal scaling impossible.
  - Approach: implement `RedisGameRegistry` behind the existing `GameRegistry` interface (seam called out in SOLUTION-1). Use `WATCH`/`MULTI` for the join-race scenario described in SOLUTION-3.

- **WS fan-out via pub/sub** — **P1**
  - Gap: WS broadcasts route through the local `Hub` only. Two instances cannot share a game.
  - Impact: sticky sessions become mandatory, capping horizontal scale.
  - Approach: Redis Pub/Sub (or NATS) channel per `gameId`; each instance subscribes and rebroadcasts to its local sockets. Aligned with SOLUTION-4 spectator architecture.

- **Snapshot/recovery on restart** — **P2**
  - Gap: even with Redis, there is no warm-recovery story for in-flight turn timers.
  - Impact: a deploy mid-turn could grant a free timeout to a player.
  - Approach: persist `turnDeadlineAt` to Redis on every transition; on boot, rehydrate timers from Redis state.

---

## Frontend UX

- **Toast / notification system** — **P1**
  - Gap: WS `ERROR` messages from the server are not surfaced to the user (`apps/web/lib/ui/GameProvider.tsx`).
  - Impact: server-side validation failures look like client bugs.
  - Approach: lightweight toast hook (`useToast`) rendering an `aria-live="assertive"` region; subscribe to the `ERROR` and `WsConnectionState` events.

- **Screen-reader announcements for shot results** — **P1**
  - Gap: `Board` cells have static ARIA labels, but no live region announces "Hit at A5" or "You sunk the destroyer".
  - Impact: blind / low-vision players cannot follow the game.
  - Approach: an `aria-live="polite"` log region inside `Hud/*` that appends a sentence per `SHOT_RESULT` message.

- **Theme switcher UI + persisted preference** — **P1**
  - Gap: `[data-theme="christmas"]` works via CSS only; there is no UI to flip it, and no `localStorage` round-trip.
  - Impact: marketing's seasonal skin requires DevTools to enable. The headline "easy theming" claim from CLAUDE.md is not user-facing.
  - Approach: small `<select>` in the lobby header that writes `data-theme` to `<html>` and persists to `localStorage`; rehydrate in `app/layout.tsx` via an inline pre-hydration script.

- **Sound cues** — **P2**
  - Gap: no audio feedback for hits / misses / sunk / turn start.
  - Impact: weaker game feel, especially on mobile where visual feedback is small.
  - Approach: a few short OGG samples played via `HTMLAudioElement`; user-toggleable preference; respect `prefers-reduced-motion`.

- **Haptics on mobile** — **P2**
  - Gap: `navigator.vibrate` is never invoked.
  - Impact: missed opportunity for tactile feedback on shots.
  - Approach: `navigator.vibrate?.(50)` on hit, `(20, 40, 20)` on sunk. Gate behind the same audio preference.

- **Safe-area insets (iOS notch)** — **P2**
  - Gap: `app/globals.css` has no `env(safe-area-inset-*)` handling.
  - Impact: HUD overlaps the iPhone notch / home indicator in landscape.
  - Approach: extend the Tailwind v4 `@theme` block with safe-area utility classes; apply to the top HUD and bottom action bar.

- **Optimistic shot feedback** — **P2**
  - Gap: the UI waits for the server's `SHOT_RESULT` before showing the marker.
  - Impact: a ~50 ms perceived delay per shot.
  - Approach: render a pending "?" marker immediately; reconcile on `SHOT_RESULT`. Mind ordering against server authority — only the marker is optimistic, score never is.

---

## Internationalisation

- **i18n framework** — **P1**
  - Gap: every string is hardcoded English across `apps/web/app/_components/**`.
  - Impact: cannot ship to any non-English market; OEO is multi-locale by default.
  - Approach: `next-intl` (App-Router-native). Extract strings into `messages/en.json`; locale-prefix routes (`/en/`, `/es/`, …); switch by `Accept-Language` on first visit.

- **Pluralisation & number formats** — **P1**
  - Gap: score rendering uses raw numbers; "1 hit" vs "2 hits" is hardcoded.
  - Impact: grammatical bugs in Slavic / Arabic locales.
  - Approach: ICU message format via `next-intl`; CLDR plural categories.

- **RTL support** — **P2**
  - Gap: layout is LTR-only.
  - Impact: blocks Arabic / Hebrew launch.
  - Approach: switch Tailwind to logical properties (`ms-*`, `pe-*`, etc.); set `dir="rtl"` on `<html>` for RTL locales.

---

## SEO & Discoverability

- **OpenGraph & Twitter cards** — **P1**
  - Gap: `apps/web/app/layout.tsx` exports only basic `metadata`. No `openGraph`, no `twitter`.
  - Impact: shared links render as plain URLs on Slack / WhatsApp / Twitter.
  - Approach: extend `metadata` with `openGraph.images` (1200×630), `twitter.card: 'summary_large_image'`. Add an `app/opengraph-image.tsx` for dynamic per-route images.

- **robots.txt & sitemap.xml** — **P1**
  - Gap: neither exists.
  - Impact: search engines cannot index the marketing surface.
  - Approach: `apps/web/app/robots.ts` and `apps/web/app/sitemap.ts` (Next.js conventions).

- **Per-route metadata** — **P1**
  - Gap: every route inherits the root `<title>`.
  - Impact: every tab reads "Battleship".
  - Approach: export `metadata` (or `generateMetadata`) from `app/game/[id]/page.tsx` and `app/new/page.tsx`.

---

## PWA & Mobile

- **`manifest.webmanifest`** — **P1**
  - Gap: `apps/web/public/` ships only the stock Next.js SVGs; no manifest, no app icons.
  - Impact: cannot be added to home screen; required for Web App Store publication (CLAUDE.md objective).
  - Approach: `apps/web/app/manifest.ts` + a 512×512 icon set (`/icons/icon-{192,512,maskable}.png`).

- **Service worker / offline shell** — **P2**
  - Gap: no SW.
  - Impact: cold start on flaky mobile networks; no offline lobby caching.
  - Approach: `@serwist/next` (modern replacement for `next-pwa`); cache the shell, never cache game state.

- **Install prompt UX** — **P2**
  - Gap: `beforeinstallprompt` is not handled.
  - Impact: returning users do not get a "Add to Home Screen" hint.
  - Approach: small banner that listens for the event and shows a "Install" button.

---

## Analytics & Consent

- **Event analytics** — **P1**
  - Gap: no instrumentation. Cannot answer "how many games per day", "mode mix", "average match length".
  - Impact: product cannot iterate without data.
  - Approach: Plausible (privacy-first, GDPR-friendly, no consent banner needed) or PostHog (richer funnel). Track: `lobby_view`, `game_create`, `game_join`, `match_end`.

- **Consent / cookie banner** — **P1**
  - Gap: no banner. Acceptable today because no cookies / no third-party trackers, but becomes mandatory the moment analytics or auth cookies ship.
  - Impact: EU GDPR non-compliance once cookies are introduced.
  - Approach: small declarative consent component reading `Cookie-Consent` from `localStorage`; gate non-essential analytics until granted.

- **GDPR data-export / delete** — **P2**
  - Gap: no flow to export or erase a player's stored data.
  - Impact: blocks EU compliance once persistence is real.
  - Approach: once Redis lands, expose `GET /api/me/export` and `DELETE /api/me` behind authenticated sessions.

---

## Performance

- **Bundle analyzer in CI** — **P1**
  - Gap: no bundle-size reporting.
  - Impact: bundle bloat creeps in unnoticed.
  - Approach: `@next/bundle-analyzer` exposed as `pnpm analyze`; CI step that fails the build if first-load JS exceeds a budget (e.g. 150 KB).

- **Lighthouse CI** — **P1**
  - Gap: no automated Lighthouse runs.
  - Impact: regressions in LCP / CLS / TBT go unnoticed.
  - Approach: `lhci` GitHub Action running on every PR against a Fly preview; budget thresholds for mobile.

- **Image optimisation policy** — **P2**
  - Gap: no image strategy (currently no raster images either).
  - Impact: future marketing assets risk shipping unoptimised.
  - Approach: enforce `next/image` everywhere; document in CLAUDE.md.

- **Code-splitting audit** — **P2**
  - Gap: theme CSS for unused themes (`christmas.css`) is statically imported.
  - Impact: paid bundle bytes for a theme that 99 % of users never see.
  - Approach: dynamic-import the active theme stylesheet at runtime based on the persisted preference.

---

## DevOps & CI/CD

- **GitHub Actions pipeline** — **P0**
  - Gap: no `.github/workflows/` directory.
  - Impact: nothing prevents a broken main branch.
  - Approach: a single `ci.yml` running on PR: `pnpm install --frozen-lockfile`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`, `pnpm audit`. Required check before merge.

- **Preview deploys** — **P1**
  - Gap: only `main` is deployed (manually) to Fly.io.
  - Impact: design review happens after merge.
  - Approach: Fly.io preview apps via `flyctl deploy --app pr-{number}` from a GitHub Action; comment the URL on the PR.

- **`.env.example` + env schema** — **P0**
  - Gap: no env documentation. `apps/web/server.ts` reads `PORT`, `HOSTNAME`, `NODE_ENV` without validation.
  - Impact: a missing var fails late, deep in the request path.
  - Approach: a `.env.example` at repo root + a `lib/env.ts` module validating with `zod`; throw at boot if invalid.

- **Release automation** — **P2**
  - Gap: no tagging, no release notes.
  - Impact: rollbacks rely on git SHA recall.
  - Approach: `changesets` for semver bumps + `GITHUB_RELEASE_NOTES`; bake the git SHA into a `/api/version` endpoint.

---

## Code Quality

- **Husky + lint-staged** — **P1**
  - Gap: no pre-commit hooks.
  - Impact: lint / format errors caught only in CI.
  - Approach: `husky` install + `lint-staged` running `prettier --write` and `eslint --fix` on staged files.

- **Commitlint** — **P2**
  - Gap: commits already follow `EX{n}:` convention by CLAUDE.md mandate, but nothing enforces it.
  - Impact: future contributors can drift.
  - Approach: `@commitlint/cli` with a custom rule for the `EX{n}:` prefix.

- **CHANGELOG** — **P2**
  - Gap: no `CHANGELOG.md`.
  - Impact: hard to communicate breaking changes once the API is shared.
  - Approach: generated by `changesets`.

- **Versioning** — **P1**
  - Gap: `apps/web/package.json` is at `0.0.0`.
  - Impact: no semver story.
  - Approach: bump to `0.1.0` (pre-1.0 unstable) and adopt semver from `1.0.0` at first public release.

---

## Compliance & Legal

- **`LICENSE`** — **P0**
  - Gap: no license file.
  - Impact: legally undistributable as-is; blocks Web App Store publication (the CLAUDE.md objective).
  - Approach: pick one (proprietary, MIT, etc.) and add `LICENSE` at the root.

- **Privacy policy** — **P0** (when analytics or auth land)
  - Gap: no `/privacy` page; no statement on what player data is collected.
  - Impact: GDPR violation the moment data is persisted.
  - Approach: `apps/web/app/privacy/page.tsx` with a clear statement of: what is collected (name, IP), retention period, contact for erasure requests.

- **Terms of service** — **P1**
  - Gap: no ToS.
  - Impact: no enforceable rules against abuse; required by app stores.
  - Approach: short ToS template covering conduct, account termination, liability disclaimer.

---

## Testing Maturity

- **E2E tests (Playwright)** — **P1**
  - Gap: 180 unit/integration tests, zero browser-level tests.
  - Impact: visual regressions and full-game flows pass review unverified.
  - Approach: Playwright with a two-context fixture (one per player); cover the lobby → placement → match → end-screen happy path on Elite, Classic, Risk.

- **Accessibility tests** — **P1**
  - Gap: ARIA roles are present but never asserted.
  - Impact: a refactor can silently break a11y.
  - Approach: `@axe-core/playwright` snapshot per major view; fail on violations.

- **WS load tests** — **P1**
  - Gap: nothing measures the hub under load.
  - Impact: SOLUTION-4's scalability claims are unverified.
  - Approach: `k6` script opening N concurrent WS connections, scripting shots; assert p99 latency stays below 100 ms.

- **Contract tests for REST + WS** — **P2**
  - Gap: the protocol shape is checked at write-site only.
  - Impact: a server change could silently break the client without a single test failing.
  - Approach: shared `protocol.test-d.ts` type tests + a `vitest` suite that round-trips every message kind.

- **Mutation testing** — **P2**
  - Gap: line coverage is good but unmutation-tested.
  - Impact: tests may pass while not actually constraining behaviour.
  - Approach: `stryker` once, periodically; track the score in CI.

---

## Configuration

- **Env schema** — **P0** (also listed under DevOps)
  - Gap: `process.env.PORT` / `HOSTNAME` / `NODE_ENV` used directly.
  - Impact: late failures on misconfiguration.
  - Approach: `zod` schema parsed once at boot; export typed `env` object.

- **Feature flags** — **P2**
  - Gap: theme + future experiments hardcoded.
  - Impact: cannot dark-launch features.
  - Approach: simple flag service (LaunchDarkly, Unleash, or a homemade Redis-backed one) keyed by `playerId`.

- **Per-mode config externalised** — **P2**
  - Gap: `EliteConfig` lives in `packages/core/src/core/scoring.ts` with the default in code.
  - Impact: balance tweaks require a deploy.
  - Approach: load `EliteConfig` from a remote JSON (Redis or S3) at game-create time; cache for 60 s. The existing `Partial<EliteConfig>` override seam is already there.

---

## Documentation

- **API reference (TypeDoc)** — **P2**
  - Gap: no generated API docs.
  - Impact: onboarding new contributors is slower.
  - Approach: TypeDoc HTML output published to GitHub Pages on tag.

- **Runbook** — **P1**
  - Gap: no `docs/RUNBOOK.md` for incidents.
  - Impact: on-call has nothing to reach for at 03:00.
  - Approach: short doc covering: "WS connections dropping", "Game stuck in placement", "Fly machine OOM", with the metrics dashboards linked.

- **Contributor onboarding** — **P2**
  - Gap: CLAUDE.md covers architecture, but no `CONTRIBUTING.md` covers workflow (branch naming, PR template, review SLA).
  - Impact: friction for multi-team scaling (CLAUDE.md's stated goal).
  - Approach: short `CONTRIBUTING.md` + a `.github/pull_request_template.md`.

---

## Summary by priority

- **P0 (must-have before public launch):** structured logging, health/ready endpoints, error tracking, graceful shutdown, React error boundary, WS origin allowlist, signed sessions, rate limiting, security headers, dependency audit in CI, Redis-backed registry, GitHub Actions pipeline, env schema, LICENSE, privacy policy.
- **P1 (polished v1):** metrics/tracing, event-loop lag, `not-found.tsx`, WS reconnect UX, CSRF, input normalisation, WS pub/sub fan-out, toast system, screen-reader announcements, theme switcher UI, i18n + plurals, OpenGraph + sitemap, per-route metadata, manifest.webmanifest, analytics + consent, bundle analyzer + Lighthouse CI, preview deploys, Prettier + Husky, semver, ToS, Playwright + axe, load tests, runbook.
- **P2 (future):** idempotent retries, snapshot/recovery, sound + haptics, safe-area insets, optimistic UI, RTL, service worker, install prompt, GDPR export/delete, image policy + code-splitting, release automation, commitlint, CHANGELOG, contract tests, mutation testing, feature flags, externalised mode config, TypeDoc, contributor docs.
