# AI2002 - Artificial Intelligence
## Assignment 06: Question 6 Project Report
**Name:** Muhammad Ahmad
**Roll Number:** 24F-0513

---

### 🔗 Project Links
- **GitHub Repository:** [https://github.com/MuhammadAhmad778/AI_A6_24F-0513](https://github.com/MuhammadAhmad778/AI_A6_24F-0513)
- **Live Vercel Deployment:** [https://ai-a6-24-f-0513.vercel.app/](https://ai-a6-24-f-0513.vercel.app/)
- **LinkedIn Demo Post:** [INSERT_YOUR_LINKEDIN_POST_LINK_HERE]

---

## 1. Project Overview
For this project, I developed a **Dynamic Wumpus Logic Agent** accessible via a modern web interface. The system comprises a React-based frontend built with Next.js and a Python inference engine built with FastAPI. 

Unlike traditional pathfinding algorithms (like A* or BFS), this agent operates purely on **Propositional Logic**. It navigates the grid safely by receiving real-time percepts (Breezes and Stenches) and deducing the safety of adjacent cells using a formal Knowledge Base.

---

## 2. The Logic Pipeline

### A. The Knowledge Base (KB)
The agent's "brain" is its Knowledge Base. It starts with basic facts (e.g., the starting cell `[0, 0]` is safe). As the agent moves, it adds new logical rules based on the percepts it encounters.

For example, if the agent moves to a cell and feels a **Breeze**, it knows at least one adjacent cell contains a Pit. It formalizes this as:
`B_x_y ⇔ (P_n1 ∨ P_n2 ∨ P_n3 ...)`

### B. Conjunctive Normal Form (CNF) Conversion
To allow our Python backend to automatically prove theorems, all rules entering the KB must be converted into **Conjunctive Normal Form (CNF)**. A sentence in CNF is a series of `AND`s, where each element is an `OR` of literals.

**Conversion Steps used in the engine:**
1. **Eliminate Implications (⇒):** `A ⇒ B` becomes `¬A ∨ B`.
2. **Eliminate Biconditionals (⇔):** `A ⇔ B` becomes `(¬A ∨ B) ∧ (¬B ∨ A)`.
3. **Move Negations Inward:** Using De Morgan's Laws, e.g., `¬(A ∧ B)` becomes `¬A ∨ ¬B`.
4. **Distribute ∨ over ∧:** To ensure the final structure is strictly clauses joined by ANDs.

In my Python implementation, these CNF clauses are stored highly efficiently as sets of strings within a `frozenset`. For example, `(¬P_1_1 ∨ B_2_1)` is stored as `frozenset(["-P_1_1", "B_2_1"])`.

---

## 3. The Resolution Refutation Loop
Before the agent enters any unknown adjacent cell, it must mathematically prove that the cell is safe. It asks two questions:
1. "Is there a pit here?" (Goal: `-P_x_y`)
2. "Is there a Wumpus here?" (Goal: `-W_x_y`)

To answer these, the backend utilizes the **Resolution Refutation** algorithm.

### The Algorithm: Proof by Contradiction
1. **Negate the Goal:** If the agent wants to prove `-P_x_y` (the cell is safe from a pit), it temporarily assumes the opposite: `P_x_y` (there IS a pit). It adds this negated goal to a temporary copy of the KB.
2. **Resolve Clauses:** The engine iterates through all pairs of clauses in the KB. It looks for complementary literals (e.g., `P_1_1` in one clause and `-P_1_1` in another).
3. **Generate Resolvents:** When a complementary pair is found, the literals cancel out, and the remaining literals from both clauses are merged into a new, smaller clause.
4. **Find the Empty Clause (Contradiction):** If resolving two unit clauses (e.g., `P_1_1` and `-P_1_1`) results in an empty clause `∅` (or `⊥`), a logical contradiction has occurred.
5. **Conclusion:** Because assuming `P_x_y` led to a contradiction, `P_x_y` must be false. Therefore, the original goal (`-P_x_y`) is strictly entailed by the Knowledge Base. The cell is 100% safe to enter.

### Algorithmic Efficiency
To prevent infinite loops during resolution (which can occur in highly complex logic bases), the engine utilizes a bounded search. It limits the number of pairs checked per iteration and breaks early if no new resolvents are generated, ensuring real-time responsiveness for the web application.
