## Section II: Advanced System Design Instructions

This section requires you to perform architectural and design work. You do not need to write any code, but you must use Class and Sequence diagrams to illustrate your design. The solutions must be scalable and consider the performance implications for a high-volume system.

For each task, create a corresponding `SOLUTION-X.md` file documenting the design decisions, patterns used, and architectural considerations.

### Exercise 4: Spectator Mode

Design the architecture for a spectator system that allows external users to watch games through two distinct viewing modalities: Live Session & Old Session.

* **Live session:** Spectators can view both players' boards, but must not have access to the coordinates of un-hit ships. The spectator should only receive updates for public events (e.g., "Shot fired at A5", "Result: Miss" or "Result: Hit").
* **Old session:** Once a game has concluded, all restrictions are lifted. The initial positions of all ships and the full history of shots become public. Spectators must be able to navigate through the history of the match, allowing them to jump to specific turns or replay the sequence of moves from the beginning to the end. You can see the two full boards at each step.

You are expected to:
1. **Design Spectator Mode:** Create a design that allows spectators to connect and watch the game. This design must integrate with the existing game architecture (from Exercise 3) without introducing significant coupling or performance bottlenecks.

**Expected Deliverables:**
1. **Class & Sequence Diagrams:** Illustrating the flow from a Player's action to a Spectator's screen.
2. A file `SOLUTION-4.md` detailing:
    * Justification of the chosen Communication Pattern, comparing it with at least one alternative.
    * Monitoring Strategy: Define specific KPIs for "Player Protection" (ensuring game performance) and "Broadcast Quality" (spectator experience).

***

Now that you have all the exercises copied and mapped out, are you ready to jump into Exercise 1 and start defining the backend data structures and API routes?