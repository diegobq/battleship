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

- [Reliability](#reliability)
- [Performance](#performance)
- [Testing Maturity](#testing-maturity)
- [Documentation](#documentation)

---

## Reliability

- **Idempotent client retries** — **P2**
  - Gap: `POST /api/game/create` and `/join` are not idempotent; a double-click could create two games.
  - Impact: lobby noise; orphan games.
  - Approach: accept an `Idempotency-Key` header; cache the response for 5 min.

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

- **P0 (must-have before public launch):** graceful shutdown.
- **P1 (polished v1):** bundle analyzer + Lighthouse CI, accessibility tests, WS load tests, runbook.
- **P2 (future):** idempotent retries, GDPR export/delete, image policy + code-splitting, contract tests, mutation testing, feature flags, externalised mode config, TypeDoc, contributor docs.
