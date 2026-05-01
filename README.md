# Wumpus World AI Logic Agent

This project implements a Knowledge-Based Artificial Intelligence Agent that navigates the classic "Wumpus World" grid. The agent uses **Propositional Logic**, **Conjunctive Normal Form (CNF)**, and **Resolution Refutation** to dynamically deduce safe paths and avoid hazards (Pits and the Wumpus).

## Architecture

- **Frontend:** Next.js (React) web interface for grid visualization and real-time percepts.
- **Backend (Inference Engine):** FastAPI (Python) server handling the logic operations and Knowledge Base (KB).

## How the Logic Engine Works

The core of the agent's intelligence is built on formal propositional logic:

### 1. Percepts and the Knowledge Base
As the agent moves, it receives percepts (Breeze, Stench) based on its current position. These percepts are converted into propositional logic sentences and added to the Knowledge Base.
- Example: If the agent feels a Breeze at `[2, 1]`, it adds the rule: `B_2_1 ⇔ (P_1_1 ∨ P_2_2 ∨ P_3_1)` to the KB.

### 2. CNF Conversion
To use automated theorem proving, all rules in the KB are converted into **Conjunctive Normal Form (CNF)**. 
- A sentence is in CNF if it is a conjunction of clauses, where each clause is a disjunction of literals.
- Implications (`⇒`) and biconditionals (`⇔`) are eliminated, negations are pushed inward using De Morgan's laws, and ORs are distributed over ANDs.
- In the backend code, clauses are stored efficiently as sets of string literals (e.g., `frozenset(["-P_1_1", "B_2_1"])`).

### 3. Resolution Refutation
Before the agent enters an unvisited cell, it uses the Resolution algorithm to ASK the Knowledge Base if the cell is safe.
- **Goal:** Prove that cell `[x, y]` does *not* contain a Pit (`-P_x_y`).
- **Method:** We use *Proof by Contradiction*. We negate the goal (assume `P_x_y` is true), add it to the KB, and continuously resolve pairs of clauses.
- If resolving two clauses produces the **empty clause (⊥)**, a contradiction is found! This proves the original goal (`-P_x_y`) is strictly entailed by the KB, meaning the cell is 100% safe.

## Running the Application Locally

**Start the Logic Engine (Terminal 1):**
```bash
pip install -r requrements.txt
uvicorn api.backend:app --reload --port 8000
```

**Start the Web Interface (Terminal 2):**
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.
