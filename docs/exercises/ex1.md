## Section I: Code & Core Implementation

**Instructions**
This section requires you to define and implement the core logic for the Battleship Game online. The objective of the game is to develop a web application that allows matches between two players in real time. The system should manage the communication between both clients, validate the movements and maintain the state of the game in a synchronous way. You should offer a solution for CSS scoping / class name collision, although comprehensive UI is not the focus. You may use recent Web APIs and are expected to demonstrate strong JavaScript fundamentals and testing practices.

For each task, create a corresponding SOLUTION-X.md file documenting design, coding, testing, and file organization decisions that you deem relevant.

### Exercise 1: Game Core Logic and Data Structures

**I. How the Game Works: Step-by-Step Flow**
The game is a classic naval combat simulation adapted for real-time online play. Here is the exact flow from the start of a session to the end of a match:

1. **Matchmaking (Lobby Phase):** This is strictly an online game designed for Player vs. Player (PvP) interactions. There is no offline mode, and you only play against real players (there is no need to develop a computer/AI player). Users can join existing games. In this phase, the user can also create new games with the following configuration:
    *   **Game mode:** description in Architectural & Design Requirements section. Simple is the default option.
    *   **Fleet definition:** the number of ships per each ship type. One of each is the default definition.
    *   **Turn timer:** the maximum number of seconds per turn. During the game if the timer is reached the user loses the turn and the opponent plays. 60 seconds is the default time.
2. **Fleet Placement (The Start):** Once two players are matched, the game begins with the setup phase. Each player is presented with an empty 8x8 grid (columns 1-8, rows A-H). Players must position their designated fleet of three ship types:
    *   Cruiser (3 cells)
    *   Destroyer (2 cells)
    *   Submarine (1 cell)
    *Crucial Rule: Ships can only be placed horizontally or vertically. They cannot be placed on a diagonal.*
3. **The Battle (Gameplay):** Once both players lock in their fleets, the shooting phase begins.
    *   **Visibility:** During the match, the user sees both boards on their screen. They see "My Board" (displaying their own ships and the enemy's incoming shots) and the "Enemy Board" (a tracking board where they record their own hits and misses against the opponent's hidden fleet).
    *   **Turn mechanics:** Players take turns selecting coordinates on the enemy's grid. The system immediately calculates if the shot is a "Hit" (strikes a ship) or a "Miss" (hits water), updating the scoring engine and the UI in real-time.
    *   **Game events:** for Hits, Misses and Ship Sinks we have to show a visual effect in both boards. If I send a bomb to my opponent I will see the effect in the Enemy Board of my screen and the opponent will see the effect in their My Board. This applies for Hits, Misses and Ship Sinks.
4. **The Resolution (Game End):** The game ends immediately when one player successfully hits every single cell of the entire enemy fleet, completely sinking the opponent's fleet. A victory screen is displayed, and the final state of both boards is revealed.

**II. Architectural & Design Requirements**
Beyond the core logic, the development of this application must adhere to the following strategic and technical guidelines:
*   **Web App Store Publishing:** The final product is intended to be published in a Web Application Store in the future. The code must be production-ready, secure, and optimized for a public release.
*   **Scalability for Multiple Teams:** The architecture must be highly modular. Multiple teams will work on this web app simultaneously in the future, so enforcing a clean separation of concerns, minimal coupling, and maximum cohesiveness is mandatory.
*   **Mobile-First Approach:** The user interface must be designed mobile-first. The layout, interactions (like drag-and-drop), and visual hierarchy must be perfectly optimized for touchscreens and smaller viewports before scaling up to desktop displays.
*   **Dynamic UI Customization:** The system must be built to accept UI customization and theming easily. The design should allow for seamless CSS scoping and swapping of styles without touching the core game logic (For example: The marketing team needs to be able to apply a special "Christmas style" skin to the entire game interface during the holiday season).
* **UI mockups:** The provided mockups (docs/UI/*.png) serve as illustrative guides for game interfaces and usability only; they do not represent mandatory implementation requirements for the UI.

This exercise focuses on defining the internal representation of the game board, ships, and implementing the scoring engine. You are expected to:
1. **Split FE and BE Responsibilities:** Clearly define and implement which business logic resides on the Frontend and which resides on the Backend, ensuring a clean separation of concerns.
2. **Define API Interface:** Define and implement the full API interface (e.g., endpoint definitions, request/response payloads) for all core game actions (lobby, ship placement, shooting, etc.).
3. **Define Ships Structure:** Create the data structures to represent the board (default 8x8) and the ships (Submarine: 1 Cell, Destroyer: 2 Cells, Cruiser: 3 cells). The design must allow new ship sizes/forms to be easily added (extensibility).
4. **Define who should start the game:** implement a logic to agree on who should make the first movement, it can be implemented in different ways, like throwing a dice.
5. **Implement Placement and Hit Logic:** Implement the backend logic to place ships (horizontal or vertical) and determine a hit/miss location.
6. **Scoring System:** the candidate must implement a dynamic scoring algorithm that rewards precision, speed, and strategic play. The score must be visible at all times on the UI and updated in real time after every interaction.
    *   **Dynamic accuracy bonus:** the points awarded for a hit shouldn't be static. The algorithm must calculate the score based on the probability of success.
        i. The lower the probability of hitting a ship (calculated by the ratio of remaining un-hit ship cells to the total remaining hidden cells on the board), the higher the reward.
        ii. High risk shots that result in a hit should grant significantly more points than safe or predictable shots.
        iii. Use a Base hit value of 10 points for the calculations.
    *   **Multipliers:** implement a multiplier system to reward performance streaks:
        i. Consecutive hits: successive hits without missing must apply an incremental multiplier (e.g. x1.5, x2, x3). The multiplier resets to x1 upon a miss.
        ii. Time-to-action: if a player records a hit within the first 3 seconds of their turn, a "reflex bonus" multiplier should be applied to that shot's score.
    *   **Penalties:** any shot that hits the water must result in a point deduction. The algorithm should ensure the score doesn't drop below zero.
    *   **UI/UX requirements:** the total score must be displayed prominently. The interface must reflect score updates and active multipliers immediately after every shot to provide instant feedback to the player.
7. **Game Modes:** the application must support three distinct game modes. The scoring engine should adjust its logic based on the selected mode.
    *   **Fastest and Precise (elite mode):** this is the full experience. The algorithm must incorporate all advanced scoring rules: i. Dynamic accuracy. ii. Consecutive hits multiplier. iii. Reflex bonus. iv. Water penalties.
    *   **Simple (classic mode):** a straightforward implementation for basic testing: i. Standard scoring: 1 point per hit. ii. No bonuses. iii. No penalties.
    *   **Penalties (risk mode):** a mode focused on accuracy where every mistake is costly: i. Scoring: 10 points per hit. ii. Water penalties: every miss results in a -1 point deduction. iii. Zero floor: the score should be updated in real-time but cannot drop below 0.

**Expected Deliverables:**
1. Fully working code for the game core logic and scoring engine.
2. A file `SOLUTION-1.md` documenting:
    a. The choice of Data Structures for the board and ships, justifying the choice in terms of memory and CPU usage for optimal performance.
    b. How the code maximizes simplicity and readability.
    c. The complete API specification.
    d. A justification for the choice of communication protocol (webSocket vs. http requests vs. Server Sent Events) for real-time interaction, including advantages and disadvantages.
