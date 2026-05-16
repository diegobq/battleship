# Production-Readiness Checklist

> **Scope.** This document enumerates concerns that are **outside** the four assessment exercises but would be required (or strongly recommended) before launching the Battleship game publicly. It is a discussion artifact, not implementation work — items are documented to make awareness explicit.
>
> For a quick at-a-glance index of MVP omissions, see [MVP-SCOPE.md](./MVP-SCOPE.md).
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
- [Frontend UX](#frontend-ux)
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
  - Approach: adopt `pino` (lowest overhead in Node). Wire a request-scoped logger middleware around the HTTP handler and the WS hub; emit JSON to stdout for the platform's log shipper.

- **Error tracking** — **P0**
  - Gap: server errors are swallowed by WS `try/catch`; client errors are not reported anywhere.
  - Impact: silent failures in production. The team will not know an error happened until a user reports it.
  - Approach: Sentry SDK on both server (`@sentry/node`) and client (`@sentry/nextjs`). Tag events with `gameId` and `mode`. Sample at 100% initially; tune later.

---

## Reliability

- **Graceful shutdown** — **P0**
  - Gap: `apps/web/server.ts` has no `SIGTERM` / `SIGINT` handler. Connections are dropped abruptly on deploy.
  - Impact: in-flight WS messages lost; players see "Connection lost" mid-game on every release.
  - Approach: on `SIGTERM`, stop accepting new WS upgrades, broadcast a `SHUTDOWN_NOTICE` to active sessions, drain for ~10 s, then `server.close()`.

- **Idempotent client retries** — **P2**
  - Gap: `POST /api/game/create` and `/join` are not idempotent; a double-click could create two games.
  - Impact: lobby noise; orphan games.
  - Approach: accept an `Idempotency-Key` header; cache the response for 5 min.

---

## Security

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

## Frontend UX

> See [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) for the design system (tokens, primitives, hooks) that covers this section. See `SOLUTION-1.md` for implementation rationale per item.

- **Sound cues** — **P2**
  - Gap: `useShotFeedback` plays OGG audio via `HTMLAudioElement` and the hook is wired into `PlayView`, but the audio asset files (`public/sounds/hit.ogg`, `miss.ogg`, `sunk.ogg`) have not been added and there is no UI toggle for the `bs-sfx` preference key.
  - Impact: the hook silently no-ops on every shot; the feature is invisible to users until assets ship.
  - Approach: add three short OGG samples under `apps/web/public/sounds/`; add a mute toggle (e.g. a speaker icon button in the HUD) that writes `localStorage["bs-sfx"] = "off"`.

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

- **P0 (must-have before public launch):** structured logging, error tracking, graceful shutdown, signed sessions, rate limiting, security headers, dependency audit in CI, GitHub Actions pipeline, env schema, LICENSE, privacy policy.
- **P1 (polished v1):** CSRF, input normalisation, OpenGraph + sitemap, per-route metadata, manifest.webmanifest, analytics + consent, bundle analyzer + Lighthouse CI, Prettier + Husky, semver, ToS, accessibility tests, WS load tests, runbook.
- **P2 (future):** idempotent retries, sound cues (assets + toggle UI), service worker, install prompt, GDPR export/delete, image policy + code-splitting, release automation, commitlint, CHANGELOG, contract tests, mutation testing, feature flags, externalised mode config, TypeDoc, contributor docs.
