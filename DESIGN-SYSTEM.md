# Battleship Design System

> A thin, four-layer system that gives the UI a shared vocabulary of tokens,
> primitives, and hooks — without a design-token pipeline, a component library,
> or a Storybook setup. Every piece exists to close a concrete gap in the
> production checklist; nothing is speculative.

---

## Table of Contents

- [Why a design system](#why-a-design-system)
- [Design tenets](#design-tenets)
- [The four layers](#the-four-layers)
- [Layer 1 — Tokens](#layer-1--tokens)
- [Layer 2 — Primitives](#layer-2--primitives)
- [Layer 3 — Hooks](#layer-3--hooks)

---

## Why a design system

The app already had the _bones_ of a design system before this layer was named:

- A **token layer** — CSS custom properties on `:root` in `globals.css`, mirrored
  into Tailwind v4 via `@theme inline`. One CSS file per skin overrides the same
  tokens under a `[data-theme="…"]` selector.
- A **theming convention** — `christmas.css` and `dark.css` are the proof-of-concept.
  The marketing team ships a new skin by adding one CSS file and flipping an HTML
  attribute; no component code changes.
- A **state seam** — `GameProvider` already exposes every event the UI layer needs
  (`errorMessage`, `lastShot`, `connection`, `dismissError`). Nothing new was wired
  on the server.

What was missing was a _surface_: named primitives, documented contracts, and hooks
that close the accessibility and UX gaps the production checklist flagged.

---

## Design tenets

1. **Reuse over invention.** Every primitive plugs into an existing mount point.
   No parallel state plumbing.
2. **Tokens before components.** A new visual concept is a CSS variable first.
   Components consume the variable, never hard-code the value.
3. **No external UI deps.** No Radix, no react-aria, no headless library.
   The primitive count is small enough to own.
4. **Mobile-first.** Every primitive ships a touch-first layout and scales up,
   matching the CLAUDE.md architectural mandate.
5. **Theming via attribute, not prop.** Components never know which theme is
   active. Themes are CSS-only overrides scoped to `[data-theme="…"]` on `<html>`.
6. **Accessibility is structural, not a retrofit.** ARIA roles, live regions,
   and focus management are designed in, not added later.

---

## The four layers

```
┌─────────────────────────────────────────────────────┐
│ L4  Integration  (existing mount points)             │
├─────────────────────────────────────────────────────┤
│ L3  Hooks  (lib/ui/)                                │
├─────────────────────────────────────────────────────┤
│ L2  Primitives  (app/_components/ui/)               │
├─────────────────────────────────────────────────────┤
│ L1  Tokens  (app/globals.css + _theme/*.css)        │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1 — Tokens

The existing token set covers colour, board state, HUD, and typography. Five new
groups were added **additively** — nothing existing changed:

| Group                                      | Purpose                                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motion (`--motion-fast/base/slow`)         | Single source of truth for animation durations. Zeroed automatically via `@media (prefers-reduced-motion: reduce)`, so every consumer gets reduced-motion support for free. |
| Radius (`--radius-sm/md/lg`)               | Consistent border-radius vocabulary across primitives.                                                                                                                      |
| Z-layers (`--z-hud/modal/toast`)           | Named stacking contexts prevent z-index wars across teams.                                                                                                                  |
| Focus ring (`--focus-ring`)                | One place to change the keyboard focus style app-wide.                                                                                                                      |
| Safe area (`--safe-top/right/bottom/left`) | `env(safe-area-inset-*)` values, applied once at the layout level via `<SafeArea>`.                                                                                         |

**Theme override contract.** A new skin file only needs to override the colour and
HUD variables under its `[data-theme="…"]` selector. Motion, radius, z-layers,
focus ring, and safe-area are theme-agnostic and are never overridden.

---

## Layer 2 — Primitives

Four components, each covering exactly one checklist gap.

### `<ToastViewport>` + `<Toast>` — system feedback

Distinct from the gameplay `ShotToast` (hit/miss/sunk events). This layer handles
_system_ feedback: server `ERROR` messages, connection state changes. The separation
keeps gameplay toasts (ephemeral, styled for drama) and system toasts (actionable,
require acknowledgement) visually and semantically separate.

`aria-live="assertive"` + `role="alert"` for errors; `"polite"` + `"status"` for
info. Animation duration reads from `--motion-base`, so reduced-motion users get
instant show/hide automatically.

### `<LiveRegion>` — screen-reader announcements

A visually hidden `role="log"` + `aria-live="polite"` region. It appends one
sentence per shot event without re-reading the whole history (`aria-atomic="false"`).
This makes the game fully followable for blind and low-vision players without
changing any visible UI.

### `<ThemeSwitcher>` — persisted theme preference

A native `<select>` element — fully keyboard-accessible, no ARIA scaffolding
required. Theme preference is scoped to the current tab via `sessionStorage`, so
two tabs can run different skins simultaneously.

A pre-hydration script in the root layout applies the stored theme before React
mounts, eliminating any flash of unstyled content. `suppressHydrationWarning` on
`<html>` silences the expected attribute mismatch.

### `<SafeArea>` — iOS notch / home indicator

A thin wrapper that applies `env(safe-area-inset-*)` padding via the `--safe-*`
tokens. Used at the root body level and on the bottom action bar inside the game
view. Requires `viewport-fit=cover` in the viewport meta, which is set via
Next.js's `export const viewport`.

---

## Layer 3 — Hooks

Five hooks, each covering exactly one checklist gap. All subscribe to
`GameProvider` outputs — no new WebSocket messages or server changes were needed.

### `useToast` — imperative toast API

A module-scoped, subscribable store (no Zustand, no Redux). The `<ToastViewport>`
subscribes via `useSyncExternalStore` with a stable server snapshot to avoid
infinite loops during SSR. The API is intentionally imperative (`toast.error(msg)`)
so callers don't need to model toasts in their own state.

### `useTheme` — theme read/write

Reads and writes `sessionStorage["bs-theme"]`. Uses `useReducer` rather than
`useState` to satisfy the React Compiler's `set-state-in-effect` rule — the
post-hydration sync from sessionStorage is dispatched, not set directly.

### `useShotAnnouncement` — SR sentence formatting

Accumulates up to 10 shot sentences for the `<LiveRegion>`. Also uses `useReducer`
for the same reason. The `formatShot` formatter is a pure function exported and
unit-tested independently.

### `useShotFeedback` — sound + haptics

Plays OGG audio via `HTMLAudioElement` and triggers `navigator.vibrate` on shots.
Both are gated by `localStorage["bs-sfx"]` (user preference) and
`prefers-reduced-motion` (accessibility). `onShot` is `useCallback`-memoised so it
is a stable reference for effect dependency arrays.

### `useOptimisticShots` — pending shot markers

Tracks a `Set<"r,c">` of cells shot but not yet confirmed by the server. The Board
renders a faint `?` marker for pending cells immediately on click. `reconcile` clears
the cell when `SHOT_RESULT` arrives. Score is never optimistic — only the visual
marker. Both `addPending` and `reconcile` are `useCallback`-memoised.
