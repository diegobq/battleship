# Exercise 3: Manage Concurrency and Disconnections

## Table of Contents

- [Concurrent Requests in the Lobby](#concurrent-requests-in-the-lobby)
- [Graceful User Disconnection During Game](#graceful-user-disconnection-during-game)

## Concurrent Requests in the Lobby

**Challenge:** Two or more players click "Join Game" for the exact same match simultaneously, potentially exceeding the 2-player limit.

### Fast Iteration (MVP)

Node.js operates on a single-threaded event loop. If the game state is stored purely in-memory (e.g., a simple `Map<string, GameState>`), handling concurrency is trivial.

- **Design:** When a join request arrives, we synchronously check if `Object.keys(game.players).length < 2`. If true, we add the player. Since Node processes one request at a time, no two users can be added simultaneously to the second slot.

### Definitive Iteration (Target Picture)

For a high-volume, scalable system, in-memory state is insufficient. We need distributed state (e.g., Redis).

- **Design:** Use Redis Transactions with Optimistic Locking.
  1.  `WATCH game:{id}`
  2.  Read the current player count.
  3.  If `< 2`, use `MULTI`.
  4.  `HSET game:{id}:players {playerId} {playerData}`
  5.  `EXEC`.
      If another request modifies the game concurrently, the `EXEC` fails, and we can retry or inform the user the game is full. This guarantees absolute consistency across multiple backend instances without expensive distributed locks.

## Graceful User Disconnection During Game

**Challenge:** A player loses connection due to a network drop, closing the tab, or switching apps on mobile.

### Fast Iteration (MVP)

Rely on the WebSocket connection lifecycle.

- **Design:**
  1. The server listens for the `close` event on the WebSocket.
  2. When triggered, it immediately broadcasts an `OPPONENT_DISCONNECTED` event to the remaining player.
  3. The frontend displays a blocking modal: "Opponent disconnected. Waiting for them to return..."
  4. The server starts an in-memory 30-second `setTimeout`. If the user does not reconnect within 30 seconds, the active player automatically wins via forfeit. If the user reconnects, the timeout is cleared and a `RESUME_GAME` event is sent.

### Definitive Iteration (Target Picture)

The MVP suffers from ephemeral state loss (if the server restarts, timeouts are lost) and lacks robust tracking across devices.

- **Design:**
  1. **Heartbeat:** Implement ping/pong frames on the WebSocket to detect silent drops quickly (e.g., mobile device sleeping).
  2. **State Persistence:** When a disconnect is detected, update the `GameState` in Redis with `status: 'paused'` and `disconnectedAt: Timestamp`.
  3. **Background Worker/TTL:** Set a Redis key with a TTL (e.g., 2 minutes) for the reconnection window. Listen to Redis Expiry Events (Keyspace notifications). If the key expires, a dedicated worker finalizes the game state and awards victory to the remaining player.
  4. **Session Resumption:** If the user reopens the app on _any_ device, the initial API call fetches their active sessions. They are automatically routed back to the game. The WebSocket authenticates, fetches the current board state, and the match resumes seamlessly, removing the blocking modal for the opponent.
