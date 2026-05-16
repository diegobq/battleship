# Production-Readiness Implementation Workflow

This document provides a checklist for implementing and validating production-readiness P0/P1 items from `PRODUCTION-CHECKLIST.md`.

---

## Pre-Implementation

1. **Choose an item** from `PRODUCTION-CHECKLIST.md` (start with P0)
2. **Open the checklist** and copy the Gap/Impact/Approach
3. **Create a plan** — use `/plan` or document in a comment what you'll implement

---

## Implementation Checklist

For each production-readiness item, verify these **three things** before committing:

### ✅ 1. Is the change **managed** (implemented)?

**What to check:**

- New files created? → Use `git status --short` to verify files exist
- Existing files modified? → Use `git diff` to review changes
- Code compiles? → Run `pnpm lint && pnpm typecheck && pnpm format` (should pass)
- Tests added/updated? → Check `pnpm test` passes

**Example for "React error boundary":**

```bash
git status --short
# Should show:
# A  apps/web/app/error.tsx
# A  apps/web/app/game/error.tsx
# A  apps/web/app/not-found.tsx
```

---

### ✅ 2. Is the change **documented**?

**Where to document (pick the right file):**

| Item Type                    | Document In                           | Section                                                                         |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| Core game logic              | `SOLUTION-1.md`                       | Add to existing relevant section (§ "Scoring Engine", § "Turn Semantics", etc.) |
| Testing changes              | `SOLUTION-2.md`                       | Add test file + coverage % to the test table                                    |
| Concurrency/disconnection    | `SOLUTION-3.md`                       | Add to appropriate subsection                                                   |
| Spectator/KPIs               | `SOLUTION-4.md`                       | Add to architecture or monitoring                                               |
| Production hardening (P0/P1) | `SOLUTION-1.md` at end OR `README.md` | Add a brief "Production-Readiness" section                                      |

**How to document:**

1. **Write a short paragraph** (3–6 sentences) explaining:
   - What was built
   - Why this approach was chosen
   - Any non-obvious trade-offs or constraints
   - don't put the priority
   - for title, use just item title without section title (Error Boundaries instead of Reliability: Error Boundaries)

2. **Example (React error boundary):**

   ```markdown
   ## Error Boundaries

   Three Next.js `error.tsx` boundaries catch render-time exceptions
   and display graceful fallbacks with recovery actions. Root boundary
   (`app/error.tsx`) protects all routes; game-level boundary
   (`app/game/error.tsx`) protects gameplay; `not-found.tsx` provides
   branded 404. All use existing design tokens for consistency. Errors
   are logged to console; Sentry integration is a follow-up task.
   ```

3. **Update the TOC** if you added a new section

---

### ✅ 3. Is it **removed from PRODUCTION-CHECKLIST.md and MVP-SCOPE.md**?

**How to prune the checklist:**

1. **Read the item you just completed** in `PRODUCTION-CHECKLIST.md`
2. **Ask: "Does my implementation fully address this?"**
   - **YES (fully addressed)** → Remove the entire 3-line bullet (Gap + Impact + Approach)
   - **PARTIAL (some aspects remain)** → Update the "Gap" line; keep the item
   - **NO (not addressed)** → Leave unchanged

3. **Update the "Summary by priority" section** at the bottom
   - Remove the item name from the P0/P1/P2 list

4. **Also check `MVP-SCOPE.md`** — if the completed item has a row there, delete that row too. A shipped feature is no longer an MVP omission.

**Example (React error boundary):**

**Before:**

```markdown
## Reliability

- **React error boundary** — **P0**
  - Gap: no boundary wraps the game UI. A render-time exception unmounts the whole app.
  - Impact: a single React error blanks the screen mid-match.
  - Approach: add `apps/web/app/error.tsx` (route-level) and a top-level boundary in `apps/web/app/layout.tsx` rendering a "Something went wrong — return to lobby" fallback. Pipe the error to Sentry.

- **`not-found.tsx`** — **P1**
  - Gap: hitting `/game/{bad-id}` shows the default Next.js 404 chrome.
  - Impact: looks unbranded; no useful next action for the user.
  - Approach: `apps/web/app/not-found.tsx` with a "Back to lobby" CTA; use the same theme tokens.
```

**After:**

```markdown
## Reliability

- **Graceful shutdown** — **P0**
  - Gap: `apps/web/server.ts` has no `SIGTERM` / `SIGINT` handler. Connections are dropped abruptly on deploy.
  - Impact: in-flight WS messages lost; players see "Connection lost" mid-game on every release.
  - Approach: on `SIGTERM`, stop accepting new WS upgrades, broadcast a `SHUTDOWN_NOTICE` to active sessions, drain for ~10 s, then `server.close()`. Combine with rolling deploys on Fly.io.
```

**Update Summary:**

```markdown
## Summary by priority

- **P0 (must-have before public launch):**
  - OLD: structured logging, health/ready endpoints, error tracking, graceful shutdown, React error boundary, WS origin allowlist, ...
  - NEW: structured logging, health/ready endpoints, error tracking, graceful shutdown, WS origin allowlist, ...
```

---

---

## Moving an item out of scope

Sometimes a checklist item is not implemented — it is **deliberately dropped** because it
is not part of this product's MVP, the spec made a different trade-off, or it belongs to
a future product layer. Use this flow instead of the implementation checklist above.

### When to use this flow

Use this when the answer to "will we ever build this in this codebase?" is **"not as part
of the MVP"** — examples: i18n, database, analytics, spectator mode.

Do **not** use it for items that are deferred but still planned (e.g. "will do in sprint 3").
Those stay in `PRODUCTION-CHECKLIST.md` with their priority intact.

### Steps

1. **Remove from `PRODUCTION-CHECKLIST.md`**
   - Delete the entire bullet (Gap + Impact + Approach)
   - Remove from the "Summary by priority" list at the bottom

2. **Add or update a row in `MVP-SCOPE.md`**
   - Pick the right category table (Data, Observability, i18n, Security, …)
   - Columns: **Topic** | **MVP state** (one-sentence explanation of what the app does instead) | **Detail** (link to PRODUCTION-CHECKLIST.md, SOLUTION-\*.md, or `—` if no further doc exists)
   - Example row:

     ```markdown
     | **i18n framework** | All strings hardcoded English. No locale routing, no `next-intl`. | — |
     ```

3. **Document in SOLUTION-\*.md only if there is a design decision** worth capturing for reviewers — e.g. "we chose in-memory over Redis intentionally at this scale". Skip it if there is nothing to justify.

4. **Commit** using the same message format, replacing `feat` with `chore`:

   ```
   chore: move <item> to MVP-SCOPE.md as out-of-scope

   <One-sentence reason why this is out of MVP scope>

   Removes from PRODUCTION-CHECKLIST.md; documented in MVP-SCOPE.md.

   Co-Authored-By: ...
   ```

### Example: removing i18n

**PRODUCTION-CHECKLIST.md before:**

```markdown
## Internationalisation

- **i18n framework** — P1
  - Gap: every string is hardcoded English …
- **Pluralisation** — P1 …
- **RTL support** — P2 …
```

**PRODUCTION-CHECKLIST.md after:** entire section deleted, items removed from Summary.

**MVP-SCOPE.md after (Internationalisation table added):**

```markdown
## Internationalisation

| Topic              | MVP state                                                         | Detail |
| ------------------ | ----------------------------------------------------------------- | ------ |
| **i18n framework** | All strings hardcoded English. No locale routing, no `next-intl`. | —      |
| **Pluralisation**  | Raw number rendering; "1 hit" vs "2 hits" is hardcoded.           | —      |
| **RTL support**    | LTR-only layout; Tailwind directional utilities not yet logical.  | —      |
```

---

## Commit Template

When committing a production-readiness fix, use this message format:

```
feat(P{N}): <short title>

<What was built>

<Why this approach>

Addresses PRODUCTION-CHECKLIST.md P{N} item: '<item name>'
Removes: [gap description]

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Example (React error boundary):**

```
feat(P0): add React error boundaries for production reliability

Implements three Next.js error.tsx boundaries to prevent blank screens on render errors:
- Root error.tsx: catches errors in all routes (home, lobby, etc.)
- Game error.tsx: catches errors in game page + GameShell component
- not-found.tsx: custom 404 page with consistent styling

Each boundary displays fallback UI with "Try Again" / "Return to Lobby" CTAs.
Uses existing design tokens (--brand-danger, --brand-primary) for consistency.
Errors logged to console; Sentry integration is a follow-up task.

Addresses PRODUCTION-CHECKLIST.md P0 item: "React error boundary"
Also addresses P1 item: "not-found.tsx"
Removes 2 checklist items (fully addressed).

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## Pre-Commit Verification

**Before you `git commit`, run this checklist:**

```bash
# 1. Verify changes are syntactically correct
pnpm lint        # Should pass with no errors
pnpm typecheck   # Should pass (or show only pre-existing errors)
pnpm test        # Should pass (or show only pre-existing failures)

# 2. Verify files are staged
git status --short
# Review the output — do the files match what you intended?

# 3. Verify checklist pruned (implementation flow)
grep -n "P0\|P1\|P2" PRODUCTION-CHECKLIST.md | grep -c "<item name>"
# Should be 0 if fully removed, 1 if partially addressed

# 4. Verify MVP-SCOPE.md updated
git diff MVP-SCOPE.md
# Implementation flow: removed row should be gone
# Out-of-scope flow: new row should be present

# 5. Verify SOLUTION files updated
git diff SOLUTION-1.md SOLUTION-2.md SOLUTION-3.md SOLUTION-4.md
# Should show your new documentation (implementation flow only)

# 6. Review the full diff
git diff --staged
# Read through and ensure it matches your intention
```

---

## Quick Checklist (Copy-Paste)

**Implementing a feature (closing a gap):**

```markdown
- [ ] Feature implemented (files created/modified)
- [ ] `pnpm lint` passes (no new errors)
- [ ] `pnpm test` passes (or only pre-existing failures)
- [ ] Documentation added to SOLUTION-X.md or README.md
- [ ] Item removed from PRODUCTION-CHECKLIST.md (Gap/Impact/Approach lines)
- [ ] Summary by priority updated (removed from P0/P1/P2 list)
- [ ] Row removed from MVP-SCOPE.md (if it was listed there)
- [ ] Commit message written with `feat(P{N}):` prefix and rationale
- [ ] `git diff --staged` reviewed and looks good
```

**Moving an item out of scope:**

```markdown
- [ ] Item removed from PRODUCTION-CHECKLIST.md (Gap/Impact/Approach lines)
- [ ] Summary by priority updated (removed from P0/P1/P2 list)
- [ ] Row added (or updated) in MVP-SCOPE.md under the right category
- [ ] SOLUTION-\*.md updated only if there is a design decision to justify
- [ ] Commit message written with `chore:` prefix
- [ ] `git diff --staged` reviewed and looks good
```

---

## Example Workflow: Implementing "Graceful Shutdown" (P0)

1. **Read the item:**

   ```
   Gap: apps/web/server.ts has no SIGTERM / SIGINT handler. Connections are dropped abruptly on deploy.
   Impact: in-flight WS messages lost; players see "Connection lost" mid-game on every release.
   Approach: on SIGTERM, stop accepting new WS upgrades, broadcast a SHUTDOWN_NOTICE to active sessions,
             drain for ~10 s, then server.close(). Combine with rolling deploys on Fly.io.
   ```

2. **Implement:**

   ```typescript
   // apps/web/server.ts
   process.on("SIGTERM", () => {
     console.log("SIGTERM received, draining connections...");
     wss.close(() => {
       console.log("WebSocket server closed");
       server.close(() => process.exit(0));
     });
     // Broadcast SHUTDOWN_NOTICE to active sessions
     hub.broadcast({ type: "SHUTDOWN_NOTICE", payload: {} });
   });
   ```

3. **Test:**

   ```bash
   pnpm lint    # ✅ pass
   pnpm test    # ✅ pass
   ```

4. **Document in SOLUTION-1.md:**

   ```markdown
   ## Production-Readiness: Graceful Shutdown (P0)

   SIGTERM/SIGINT handlers have been added to `apps/web/server.ts` to drain
   active WebSocket connections gracefully during deploy. On signal receipt,
   the server broadcasts a `SHUTDOWN_NOTICE` to all connected players, closes
   the upgrade handler to prevent new connections, and waits up to 10 seconds
   for existing sockets to close cleanly before hard-terminating. This prevents
   mid-game disconnects on rolling deploys when paired with Fly.io's 30-second
   drain timeout.
   ```

5. **Update PRODUCTION-CHECKLIST.md:**
   Remove the entire "Graceful shutdown" bullet from § Reliability

6. **Update Summary:**
   Remove "graceful shutdown" from P0 list

7. **Commit:**

   ```bash
   git add apps/web/server.ts SOLUTION-1.md PRODUCTION-CHECKLIST.md
   git commit -m "feat(P0): implement graceful shutdown handler

   SIGTERM/SIGINT now closes the WebSocket server gracefully, broadcasting
   a SHUTDOWN_NOTICE to active sessions before draining for 10 seconds.
   Prevents mid-game disconnects during rolling deploys.

   Addresses PRODUCTION-CHECKLIST.md P0: 'Graceful shutdown'

   Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
   ```

---

## Summary

**Two flows — pick the right one:**

| Scenario                    | PRODUCTION-CHECKLIST.md     | MVP-SCOPE.md          | SOLUTION-\*.md                                    |
| --------------------------- | --------------------------- | --------------------- | ------------------------------------------------- |
| **Feature implemented**     | Remove item (Gap + Summary) | Remove row if present | Add rationale paragraph                           |
| **Item moved out of scope** | Remove item (Gap + Summary) | Add/update row        | Add only if there is a design decision to justify |

**Before each commit:**

1. Run `pnpm lint`, `pnpm test`, `pnpm typecheck`
2. Review `git diff --staged`
3. Use `feat(P{N}):` prefix for implementations; `chore:` for out-of-scope moves
4. Confirm both `PRODUCTION-CHECKLIST.md` and `MVP-SCOPE.md` are in sync

This ensures every gap is **built**, **scoped out**, or **explained** — and never just silently dropped.
