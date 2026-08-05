import fs from 'fs';

const {pts} = JSON.parse(fs.readFileSync('monaco_loop_v2.json', 'utf8'));

// Build adjacency
const grid = new Map();
for (let i = 0; i < pts.length; i++) grid.set(`${pts[i].x},${pts[i].y}`, i);

const adj = Array.from({length: pts.length}, () => []);
for (let i = 0; i < pts.length; i++) {
  const p = pts[i];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const key = `${p.x + dx},${p.y + dy}`;
      if (grid.has(key)) {
        adj[i].push(grid.get(key));
      }
    }
  }
}

let deg3Count = 0;
let deg4Count = 0;
for (let i = 0; i < pts.length; i++) {
  if (adj[i].length === 3) deg3Count++;
  if (adj[i].length >= 4) deg4Count++;
  if (adj[i].length >= 3 && pts[i].x > 1150) {
    console.log(`Junction at X=${pts[i].x}, Y=${pts[i].y}, degree=${adj[i].length}`);
  }
}

console.log(`Degree 3 nodes: ${deg3Count}, Degree 4+ nodes: ${deg4Count}`);
