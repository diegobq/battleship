# MVP Scope Boundaries

> A single-place index of what was **intentionally omitted** from this MVP and where
> to find implementation guidance when each item is prioritised. Nothing here is a
> surprise or a bug — these are deliberate trade-offs to keep the assessment scope
> clean. Every item links to the document that already holds the detail.

---

## Table of Contents

- [Data & Persistence](#data--persistence)
- [Observability](#observability)
- [Internationalisation](#internationalisation)
- [Security](#security)
- [Infrastructure & Scaling](#infrastructure--scaling)
- [Features](#features)
- [Code Quality](#code-quality)
- [Design System Tooling](#design-system-tooling)
- [Performance](#performance)
- [Testing](#testing)
- [Documentation](#documentation)
- [Legal & Compliance](#legal--compliance)

---

## Data & Persistence

| Topic                         | MVP state                                                                                       | Detail                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Database**                  | In-memory only — `GameRegistry` lives on `globalThis`. A server restart drops all active games. | [SOLUTION-1.md § In-Memory State Seam](./SOLUTION-1.md#in-memory-state-seam) · [SOLUTION-3.md](./SOLUTION-3.md) |
| **GDPR data export / delete** | No flow; no persisted data to export yet.                                                       | —                                                                                                               |

---

## Observability

| Topic                       | MVP state                                                                                                       | Detail |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| **Structured logging**      | Ad-hoc `console.log` / `console.error`. No log levels, no JSON output, no correlation IDs.                      | —      |
| **Error tracking**          | Server errors are swallowed by WS `try/catch`; client errors go nowhere.                                        | —      |
| **Analytics / tracking**    | No event tracking; cannot answer "games per day", "mode mix", "average match length".                           | —      |
| **Consent / cookie banner** | No banner. Session cookie is live; a consent banner is required once analytics or persistent auth cookies ship. | —      |

---

## Internationalisation

| Topic              | MVP state                                                         | Detail |
| ------------------ | ----------------------------------------------------------------- | ------ |
| **i18n framework** | All strings hardcoded English. No locale routing, no `next-intl`. | —      |
| **Pluralisation**  | Raw number rendering; "1 hit" vs "2 hits" is hardcoded.           | —      |
| **RTL support**    | LTR-only layout; Tailwind directional utilities not yet logical.  | —      |

---

## Security

| Topic                  | MVP state                                                                                                                                                                                                                                                   | Detail                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **REST rate limiting** | Per-IP throttling is a reverse-proxy concern (Nginx / Fly.io). No application-layer limit on `/create` or `/join`. Future `withAuth` routes should add per-`playerId` throttling in the wrapper. WS rate limiting (10 msg/s per connection) is implemented. | [SOLUTION-1.md § Rate Limiting](./SOLUTION-1.md#rate-limiting) |
| **Dependency audit**   | `pnpm audit` is never run in CI. Not wired up yet — no pipeline exists.                                                                                                                                                                                     | —                                                              |

---

## Infrastructure & Scaling

| Topic                  | MVP state                                                                                                                                                                                   | Detail                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Horizontal scaling** | Single-instance only. WebSocket hub is in-memory; no Redis pub-sub for multi-node fan-out.                                                                                                  | [SOLUTION-3.md](./SOLUTION-3.md)                                       |
| **Graceful shutdown**  | Implemented — `SIGTERM`/`SIGINT` handler drains connections and broadcasts `SHUTDOWN_NOTICE`.                                                                                               | [SOLUTION-1.md § Graceful Shutdown](./SOLUTION-1.md#graceful-shutdown) |
| **CI/CD pipeline**     | No `.github/workflows/`. Nothing gates a broken `main`.                                                                                                                                     | —                                                                      |
| **Dependency audit**   | `pnpm audit` is not run. Belongs in the CI pipeline as a `pnpm audit --prod --audit-level high` step. Not wired up yet — no pipeline exists.                                                | —                                                                      |
| **Release automation** | No tagging, no release notes. Rollbacks rely on git SHA recall.                                                                                                                             | —                                                                      |
| **Feature flags**      | Theme and experiments are hardcoded. No LaunchDarkly / Unleash / Redis-backed flag service.                                                                                                 | —                                                                      |
| **Per-mode config**    | `EliteConfig` is hardcoded in `packages/core/src/core/scoring.ts`. Balance tweaks require a deploy. The `Partial<EliteConfig>` override seam is ready for a remote JSON loader when needed. | —                                                                      |

---

## Features

| Topic                 | MVP state                                                             | Detail |
| --------------------- | --------------------------------------------------------------------- | ------ |
| **Service worker**    | No SW. Cold start on flaky mobile networks; no offline lobby caching. | —      |
| **Install prompt UX** | `beforeinstallprompt` is not handled; no "Add to Home Screen" nudge.  | —      |

---

## Code Quality

| Topic                   | MVP state                                                                                        | Detail |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| **Husky + lint-staged** | No pre-commit hooks. Quality gates run manually and in CI instead of enforcing fixes pre-commit. | —      |
| **Commitlint**          | Commit naming follows repo guidance socially; no automated enforcement is configured.            | —      |
| **CHANGELOG**           | No generated changelog yet; release communication remains informal at MVP stage.                 | —      |
| **Versioning**          | Package version stays at `0.0.0`; formal semver is deferred until there is a public release cut. | —      |

---

## Design System Tooling

| Topic                                                       | MVP state                                                                                      | Detail                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Storybook / Chromatic**                                   | Primitive count is small enough for in-app inspection; no visual-regression CI.                | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) |
| **Design-token pipeline** (Style Dictionary, Tokens Studio) | CSS variables + Tailwind v4 `@theme` cover every use case; no build-step token transformation. | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) |
| **Animation library**                                       | Keyframes are inline in component CSS modules; durations read from `--motion-*` tokens.        | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) |

---

## Performance

| Topic                         | MVP state                                                                                                                                                                                                                     | Detail |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Bundle analyser**           | `pnpm -F @battleship/web analyze` is available (see `README.md`). The script enables a future CI step to fail the build when first-load JS exceeds a size threshold — not wired up yet as no pipeline exists.                 | —      |
| **Lighthouse CI**             | Local script available: `pnpm -F @battleship/web lighthouse` (see `README.md`). Automated runs on every PR are not wired up yet — no pipeline exists.                                                                         | —      |
| **Image optimisation policy** | Enforced by `@next/next/no-img-element` (included in `eslint-config-next/core-web-vitals`). Any raw `<img>` tag is a lint error. No raster images yet — policy is ready for when they are added.                              | —      |
| **Code-splitting audit**      | Theme CSS files (`dark.css`, `christmas.css`) are statically imported but each is ~590 bytes — negligible overhead. Dynamic import adds more JS complexity than it saves at this scale. Revisit if themes grow significantly. | —      |

---

## Testing

| Topic                          | MVP state                                                                                                                                                                                                                                                                      | Detail                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **WS load tests**              | No `k6` or equivalent load harness. The hub's behaviour under concurrent connections is covered by unit tests but not benchmarked at scale.                                                                                                                                    | [SOLUTION-2.md § Known Gaps](./SOLUTION-2.md#7-known-gaps--follow-ons) |
| **Contract tests (REST + WS)** | Protocol shape is validated by `parseClientMessage` / `sanitizeGameStateFor` unit tests and `handlers.test.ts` integration tests. A separate `protocol.test-d.ts` TypeScript declaration test file is not included; the existing suite covers all message kinds behaviourally. | [SOLUTION-2.md](./SOLUTION-2.md)                                       |
| **Mutation testing**           | Line and branch coverage is high (≥ 95% for core, ≥ 90% for web) but no `stryker` run verifies that tests actually constrain behaviour.                                                                                                                                        | —                                                                      |

---

## Documentation

| Topic                       | MVP state                                                                                                | Detail |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| **API reference (TypeDoc)** | No generated API docs. TypeDoc HTML output on GitHub Pages deferred until there is a public release cut. | —      |

---

## Legal & Compliance

| Topic                | MVP state                                                                                                                      | Detail |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| **Privacy policy**   | No `/privacy` page. Session cookie is live; a policy is required before public launch but is out of scope for this assessment. | —      |
| **Terms of service** | No ToS. Required by app stores; out of scope for this assessment.                                                              | —      |
| **Consent banner**   | No cookie / analytics consent banner. Not required yet — no cookies or trackers — but becomes mandatory when analytics land.   | —      |
