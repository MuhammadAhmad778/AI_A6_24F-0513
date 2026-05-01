from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Set, Tuple
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Knowledge Base: stores CNF clauses as sets of literals
# Literal format: "P_x_y" (pit), "W_x_y" (wumpus), "B_x_y" (breeze), "S_x_y" (stench)
# Negation: "-P_x_y"
KB: Set[frozenset] = set()
visited: Set[Tuple[int, int]] = set()
safe: Set[Tuple[int, int]] = set()
pits: Set[Tuple[int, int]] = set()
wumpus: Tuple[int, int] = None
grid_size = (4, 4)
inference_count = 0

class InitRequest(BaseModel):
    rows: int
    cols: int

class MoveRequest(BaseModel):
    x: int
    y: int

def reset_game(rows: int, cols: int):
    global KB, visited, safe, pits, wumpus, grid_size, inference_count
    KB = set()
    visited = set()
    safe = {(0, 0)}
    grid_size = (rows, cols)
    inference_count = 0
    
    # Place pits (20% of cells, avoid start)
    all_cells = [(r, c) for r in range(rows) for c in range(cols) if (r, c) != (0, 0)]
    num_pits = max(1, len(all_cells) // 5)
    pits = set(random.sample(all_cells, num_pits))
    
    # Place wumpus (avoid start and pits)
    remaining = [c for c in all_cells if c not in pits]
    wumpus = random.choice(remaining)
    
    # Add initial knowledge: start cell is safe
    KB.add(frozenset(["-P_0_0"]))
    KB.add(frozenset(["-W_0_0"]))

def get_neighbors(x: int, y: int) -> List[Tuple[int, int]]:
    neighbors = []
    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < grid_size[0] and 0 <= ny < grid_size[1]:
            neighbors.append((nx, ny))
    return neighbors

def add_percept_rules(x: int, y: int, has_breeze: bool, has_stench: bool):
    """Add propositional logic rules based on percepts"""
    global inference_count
    neighbors = get_neighbors(x, y)
    
    # Breeze iff at least one neighbor has pit
    if has_breeze:
        KB.add(frozenset([f"B_{x}_{y}"]))
        # At least one neighbor is pit: P_n1 ∨ P_n2 ∨ ...
        clause = frozenset([f"P_{nx}_{ny}" for nx, ny in neighbors])
        KB.add(clause)
    else:
        KB.add(frozenset([f"-B_{x}_{y}"]))
        # No breeze means no pits in neighbors
        for nx, ny in neighbors:
            KB.add(frozenset([f"-P_{nx}_{ny}"]))
    
    # Stench iff at least one neighbor has wumpus
    if has_stench:
        KB.add(frozenset([f"S_{x}_{y}"]))
        clause = frozenset([f"W_{nx}_{ny}" for nx, ny in neighbors])
        KB.add(clause)
    else:
        KB.add(frozenset([f"-S_{x}_{y}"]))
        for nx, ny in neighbors:
            KB.add(frozenset([f"-W_{nx}_{ny}"]))

def resolve(c1: frozenset, c2: frozenset) -> Set[frozenset]:
    """Resolution: find complementary literals and resolve"""
    global inference_count
    inference_count += 1
    
    resolvents = set()
    for lit1 in c1:
        # Check if negation exists in c2
        if lit1.startswith("-"):
            complement = lit1[1:]
        else:
            complement = "-" + lit1
        
        if complement in c2:
            # Resolve: remove complementary pair, union the rest
            new_clause = (c1 - {lit1}) | (c2 - {complement})
            if len(new_clause) == 0:  # Empty clause = contradiction
                return {frozenset()}
            resolvents.add(new_clause)
    
    return resolvents

def ask_kb(query: str) -> bool:
    """Use resolution refutation to check if KB ⊨ query"""
    global inference_count
    inference_count = 0
    
    # Negate query and add to KB copy
    temp_kb = KB.copy()
    temp_kb.add(frozenset(["-" + query if not query.startswith("-") else query[1:]]))
    
    new = set()
    max_iterations = 100
    
    for _ in range(max_iterations):
        clauses = list(temp_kb)
        pairs_checked = 0
        
        for i in range(len(clauses)):
            for j in range(i + 1, len(clauses)):
                resolvents = resolve(clauses[i], clauses[j])
                
                if frozenset() in resolvents:  # Found contradiction
                    return True
                
                new.update(resolvents)
                pairs_checked += 1
                if pairs_checked > 200:  # Limit work per iteration
                    break
            if pairs_checked > 200:
                break
        
        if new.issubset(temp_kb):  # No new clauses
            return False
        
        temp_kb.update(new)
    
    return False

@app.post("/api/init")
def init_game(req: InitRequest):
    reset_game(req.rows, req.cols)
    return {
        "rows": grid_size[0],
        "cols": grid_size[1],
        "message": "Game initialized"
    }

@app.post("/api/move")
def make_move(req: MoveRequest):
    x, y = req.x, req.y
    
    # Check percepts
    has_breeze = (x, y) in [n for p in pits for n in [p] if any(abs(p[0]-x) + abs(p[1]-y) == 1 for p in pits)]
    has_breeze = any(abs(px - x) + abs(py - y) == 1 for px, py in pits)
    has_stench = abs(wumpus[0] - x) + abs(wumpus[1] - y) == 1
    
    # Update knowledge
    visited.add((x, y))
    add_percept_rules(x, y, has_breeze, has_stench)
    
    # Check neighbors for safety
    safe_cells = []
    for nx, ny in get_neighbors(x, y):
        if (nx, ny) not in visited:
            no_pit = ask_kb(f"-P_{nx}_{ny}")
            no_wumpus = ask_kb(f"-W_{nx}_{ny}")
            if no_pit and no_wumpus:
                safe.add((nx, ny))
                safe_cells.append((nx, ny))
    
    return {
        "percepts": {
            "breeze": has_breeze,
            "stench": has_stench
        },
        "visited": list(visited),
        "safe": list(safe),
        "inference_steps": inference_count,
        "safe_neighbors": safe_cells,
        "actual_pits": list(pits),  # For debugging/visualization
        "actual_wumpus": list(wumpus)
    }

@app.get("/")
def root():
    return {"status": "Wumpus World API Running"}