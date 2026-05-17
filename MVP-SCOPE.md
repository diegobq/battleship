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
- [Legal & Compliance](#legal--compliance)

---

## Data & Persistence

| Topic                         | MVP state                                                                                       | Detail                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Database**                  | In-memory only — `GameRegistry` lives on `globalThis`. A server restart drops all active games. | [SOLUTION-1.md § In-Memory State Seam](./SOLUTION-1.md#in-memory-state-seam) · [SOLUTION-3.md](./SOLUTION-3.md) |
| **GDPR data export / delete** | No flow; no persisted data to export yet.                                                       | [PRODUCTION-CHECKLIST.md § Analytics & Consent](./PRODUCTION-CHECKLIST.md#analytics--consent)                   |

---

## Observability

| Topic                    | MVP state                                                                                  | Detail                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Structured logging**   | Ad-hoc `console.log` / `console.error`. No log levels, no JSON output, no correlation IDs. | —                                                                                             |
| **Error tracking**       | Server errors are swallowed by WS `try/catch`; client errors go nowhere.                   | —                                                                                             |
| **Analytics / tracking** | No event tracking; cannot answer "games per day", "mode mix", "average match length".      | [PRODUCTION-CHECKLIST.md § Analytics & Consent](./PRODUCTION-CHECKLIST.md#analytics--consent) |

---

## Internationalisation

| Topic              | MVP state                                                         | Detail |
| ------------------ | ----------------------------------------------------------------- | ------ |
| **i18n framework** | All strings hardcoded English. No locale routing, no `next-intl`. | —      |
| **Pluralisation**  | Raw number rendering; "1 hit" vs "2 hits" is hardcoded.           | —      |
| **RTL support**    | LTR-only layout; Tailwind directional utilities not yet logical.  | —      |

---

## Security

| Topic                | MVP state                                                         | Detail                                                                   |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Rate limiting**    | No throttling on REST or WS. A client can flood `SHOOT` messages. | [PRODUCTION-CHECKLIST.md § Security](./PRODUCTION-CHECKLIST.md#security) |
| **Security headers** | No CSP, HSTS, `X-Frame-Options`, or `Referrer-Policy`.            | [PRODUCTION-CHECKLIST.md § Security](./PRODUCTION-CHECKLIST.md#security) |
| **Dependency audit** | `pnpm audit` is never run in CI.                                  | [PRODUCTION-CHECKLIST.md § Security](./PRODUCTION-CHECKLIST.md#security) |

---

## Infrastructure & Scaling

| Topic                  | MVP state                                                                                  | Detail                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Horizontal scaling** | Single-instance only. WebSocket hub is in-memory; no Redis pub-sub for multi-node fan-out. | [SOLUTION-3.md](./SOLUTION-3.md)                                                   |
| **Graceful shutdown**  | No `SIGTERM` handler. Active WS connections drop on every deploy.                          | [PRODUCTION-CHECKLIST.md § Reliability](./PRODUCTION-CHECKLIST.md#reliability)     |
| **CI/CD pipeline**     | No `.github/workflows/`. Nothing gates a broken `main`.                                    | [PRODUCTION-CHECKLIST.md § DevOps & CI/CD](./PRODUCTION-CHECKLIST.md#devops--cicd) |
| **Env schema**         | `process.env.*` read directly; a missing var fails late and deep.                          | [PRODUCTION-CHECKLIST.md § Configuration](./PRODUCTION-CHECKLIST.md#configuration) |

---

## Features

| Topic                    | MVP state                                                        | Detail                                                                          |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **PWA / installability** | No `manifest.webmanifest`, no service worker, no install prompt. | [PRODUCTION-CHECKLIST.md § PWA & Mobile](./PRODUCTION-CHECKLIST.md#pwa--mobile) |

---

## Code Quality

| Topic                   | MVP state                                                                                        | Detail                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Husky + lint-staged** | No pre-commit hooks. Quality gates run manually and in CI instead of enforcing fixes pre-commit. | —                                                                                  |
| **Commitlint**          | Commit naming follows repo guidance socially; no automated enforcement is configured.            | —                                                                                  |
| **CHANGELOG**           | No generated changelog yet; release communication remains informal at MVP stage.                 | —                                                                                  |
| **Versioning**          | Package version stays at `0.0.0`; formal semver is deferred until there is a public release cut. | [PRODUCTION-CHECKLIST.md § DevOps & CI/CD](./PRODUCTION-CHECKLIST.md#devops--cicd) |

---

## Design System Tooling

| Topic                                                       | MVP state                                                                                      | Detail                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Storybook / Chromatic**                                   | Primitive count is small enough for in-app inspection; no visual-regression CI.                | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) |
| **Design-token pipeline** (Style Dictionary, Tokens Studio) | CSS variables + Tailwind v4 `@theme` cover every use case; no build-step token transformation. | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) |
| **Animation library**                                       | Keyframes are inline in component CSS modules; durations read from `--motion-*` tokens.        | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) |

---

## Legal & Compliance

| Topic                | MVP state                                                                                                                    | Detail                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **LICENSE**          | No license file; the repo is legally undistributable.                                                                        | [PRODUCTION-CHECKLIST.md § Compliance & Legal](./PRODUCTION-CHECKLIST.md#compliance--legal)   |
| **Privacy policy**   | No `/privacy` page; no statement on what data is collected. Required before any data is persisted.                           | [PRODUCTION-CHECKLIST.md § Compliance & Legal](./PRODUCTION-CHECKLIST.md#compliance--legal)   |
| **Terms of service** | No ToS; required by app stores.                                                                                              | [PRODUCTION-CHECKLIST.md § Compliance & Legal](./PRODUCTION-CHECKLIST.md#compliance--legal)   |
| **Consent banner**   | No cookie / analytics consent banner. Not required yet — no cookies or trackers — but becomes mandatory when analytics land. | [PRODUCTION-CHECKLIST.md § Analytics & Consent](./PRODUCTION-CHECKLIST.md#analytics--consent) |
