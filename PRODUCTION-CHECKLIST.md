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

- [Testing Maturity](#testing-maturity)

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

## Summary by priority

- **P1 (polished v1):** accessibility tests, WS load tests.
- **P2 (future):** GDPR export/delete, image policy + code-splitting, contract tests, mutation testing.
