"use client";
import { useState } from "react";

const API_URL = process.env.NODE_ENV === "development" ? "http://localhost:8000" : "";

export default function WumpusWorld() {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [gameStarted, setGameStarted] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [safe, setSafe] = useState<Set<string>>(new Set(["0,0"]));
  const [percepts, setPercepts] = useState({ breeze: false, stench: false });
  const [inferenceSteps, setInferenceSteps] = useState(0);
  const [agentPos, setAgentPos] = useState<[number, number]>([0, 0]);
  const [pits, setPits] = useState<Set<string>>(new Set());
  const [wumpus, setWumpus] = useState<[number, number] | null>(null);

  const startGame = async () => {
    const res = await fetch(`${API_URL}/api/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, cols }),
    });
    await res.json();
    setGameStarted(true);
    setVisited(new Set(["0,0"]));
    setSafe(new Set(["0,0"]));
    setAgentPos([0, 0]);
    setPits(new Set());
    setWumpus(null);
    await moveAgent(0, 0);
  };

  const moveAgent = async (x: number, y: number) => {
    const res = await fetch(`${API_URL}/api/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    });
    const data = await res.json();
    
    setAgentPos([x, y]);
    setPercepts(data.percepts);
    setInferenceSteps(data.inference_steps);
    setVisited(new Set(data.visited.map((v: number[]) => `${v[0]},${v[1]}`)));
    setSafe(new Set(data.safe.map((s: number[]) => `${s[0]},${s[1]}`)));
    setPits(new Set(data.actual_pits.map((p: number[]) => `${p[0]},${p[1]}`)));
    setWumpus(data.actual_wumpus);
  };

  const getCellColor = (r: number, c: number) => {
    const key = `${r},${c}`;
    const isAgent = agentPos[0] === r && agentPos[1] === c;
    const isPit = pits.has(key);
    const isWumpus = wumpus && wumpus[0] === r && wumpus[1] === c;
    
    if (isAgent) return "bg-blue-500";
    if (visited.has(key)) return "bg-green-500";
    if (safe.has(key)) return "bg-green-300";
    if (isPit || isWumpus) return "bg-red-500";
    return "bg-gray-300";
  };

  const getCellLabel = (r: number, c: number) => {
    const key = `${r},${c}`;
    const isPit = pits.has(key);
    const isWumpus = wumpus && wumpus[0] === r && wumpus[1] === c;
    
    if (agentPos[0] === r && agentPos[1] === c) return "🤖";
    if (isPit) return "⚫";
    if (isWumpus) return "👹";
    if (visited.has(key)) return "✓";
    if (safe.has(key)) return "?";
    return "";
  };

  const handleRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) setRows(val);
  };

  const handleColChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) setCols(val);
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-6 text-center">Wumpus World</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rows:</label>
              <input
                type="number"
                value={rows}
                onChange={handleRowChange}
                min="3"
                max="10"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Columns:</label>
              <input
                type="number"
                value={cols}
                onChange={handleColChange}
                min="3"
                max="10"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <button
              onClick={startGame}
              className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Wumpus World</h1>
        
        {/* Metrics Dashboard */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Metrics Dashboard</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm text-gray-600">Inference Steps</div>
              <div className="text-2xl font-bold">{inferenceSteps}</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-sm text-gray-600">Cells Visited</div>
              <div className="text-2xl font-bold">{visited.size}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-sm text-gray-600">Safe Cells</div>
              <div className="text-2xl font-bold">{safe.size}</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <div className="font-semibold mb-2">Current Percepts:</div>
            <div className="flex gap-4">
              <span className={percepts.breeze ? "text-blue-600 font-bold" : "text-gray-400"}>
                💨 Breeze: {percepts.breeze ? "YES" : "NO"}
              </span>
              <span className={percepts.stench ? "text-red-600 font-bold" : "text-gray-400"}>
                💀 Stench: {percepts.stench ? "YES" : "NO"}
              </span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Grid ({rows}×{cols})</h2>
            <button
              onClick={startGame}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Reset Game
            </button>
          </div>
          
          <div
            className="grid gap-2 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              maxWidth: `${cols * 80}px`,
            }}
          >
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => (
                <button
                  key={`${r},${c}`}
                  onClick={() => moveAgent(r, c)}
                  className={`w-full aspect-square ${getCellColor(r, c)} 
                    text-white font-bold text-xl rounded border-2 border-gray-400
                    hover:opacity-80 transition-all flex items-center justify-center`}
                  title={`Cell (${r},${c})`}
                >
                  {getCellLabel(r, c)}
                </button>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded"></div>
              <span>Agent 🤖</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
              <span>Visited ✓</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-300 rounded"></div>
              <span>Safe (Inferred)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
              <span>Unknown</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded"></div>
              <span>Pit ⚫ / Wumpus 👹</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}