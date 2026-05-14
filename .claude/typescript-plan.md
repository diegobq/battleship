Plan: Split UI Types (React convention)
TL;DR — Extract shared UI types into a single apps/web/lib/ui/types.ts while keeping component-local types colocated. Move placement/WebSocket/context types first, update imports, add a small barrel export, then run type-checks and tests. This preserves locality for small components and enables reuse for multi-file types.

Steps
Create apps/web/lib/ui/types.ts and export shared UI types: PlacementState, PlacementAction, GameContextValue, ShotEvent, WsMessage, WsConnectionState.
Move the types from GameProvider.tsx (GameContextValue), placementReducer.ts (PlacementState, PlacementAction), and useWebSocket.ts (WsMessage, WsConnectionState) into types.ts.
Update those files to import the moved symbols (e.g., import { PlacementState } from './types').
Keep single-component props/types colocated (e.g., Board props remain in Board.tsx) unless reused by >1 file.
Add a small barrel apps/web/lib/ui/index.ts exporting types.ts for convenient imports across the UI.
Run a TypeScript type-check and the web unit tests; fix import paths and any type regressions.
Further Considerations
Split types.ts later into domain files (e.g., placement.types.ts) if it grows beyond ~200–300 lines.
Add lightweight type guards (e.g., isPlacementState) for runtime validation of critical messages.
Add one tsd or Vitest type assertion file to protect the public shapes of moved types.