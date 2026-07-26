import fs from 'fs';

const {w, h, mask, minX, minY, maxX, maxY} = JSON.parse(fs.readFileSync('monaco_mask_v2_clean.json', 'utf8'));

let img = mask.slice();

let changing = true;
while (changing) {
  changing = false;
  
  for (let step = 0; step < 2; step++) {
    const toDelete = [];
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p1 = img[y * w + x];
        if (p1 === 0) continue;
        
        const p2 = img[(y - 1) * w + x];
        const p3 = img[(y - 1) * w + (x + 1)];
        const p4 = img[y * w + (x + 1)];
        const p5 = img[(y + 1) * w + (x + 1)];
        const p6 = img[(y + 1) * w + x];
        const p7 = img[(y + 1) * w + (x - 1)];
        const p8 = img[y * w + (x - 1)];
        const p9 = img[(y - 1) * w + (x - 1)];
        
        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
        
        let B = 0;
        for (let i = 0; i < 8; i++) {
          if (neighbors[i] === 1) B++;
        }
        
        if (B < 2 || B > 6) continue;
        
        let A = 0;
        for (let i = 0; i < 8; i++) {
          const n1 = neighbors[i];
          const n2 = neighbors[(i + 1) % 8];
          if (n1 === 0 && n2 === 1) A++;
        }
        
        if (A !== 1) continue;
        
        if (step === 0) {
          if (p2 * p4 * p6 !== 0) continue;
          if (p4 * p6 * p8 !== 0) continue;
        } else {
          if (p2 * p4 * p8 !== 0) continue;
          if (p2 * p6 * p8 !== 0) continue;
        }
        
        toDelete.push(y * w + x);
      }
    }
    
    if (toDelete.length > 0) {
      changing = true;
      for (const idx of toDelete) {
        img[idx] = 0;
      }
    }
  }
}

const pts = [];
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (img[y * w + x] === 1) {
      pts.push({x, y});
    }
  }
}

console.log(`Skeleton has ${pts.length} points.`);

// Prune leaf nodes
const adj = Array.from({length: pts.length}, () => []);
const grid = new Map();
for (let i = 0; i < pts.length; i++) {
  grid.set(`${pts[i].x},${pts[i].y}`, i);
}

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

let pruning = true;
let prunedCount = 0;
const isRemoved = new Array(pts.length).fill(false);
const deg = new Array(pts.length).fill(0);
for (let i = 0; i < pts.length; i++) deg[i] = adj[i].length;

while (pruning) {
  pruning = false;
  const leaves = [];
  for (let i = 0; i < pts.length; i++) {
    if (!isRemoved[i] && deg[i] === 1) {
      leaves.push(i);
    }
  }
  for (const i of leaves) {
    isRemoved[i] = true;
    pruning = true;
    prunedCount++;
    for (const neighbor of adj[i]) {
      deg[neighbor]--;
    }
  }
}

console.log(`Pruned ${prunedCount} leaf nodes.`);

const remaining = [];
for (let i = 0; i < pts.length; i++) {
  if (!isRemoved[i]) remaining.push(pts[i]);
}

console.log(`Remaining loop points: ${remaining.length}`);
fs.writeFileSync('monaco_loop_v2.json', JSON.stringify({pts: remaining, minX, minY, maxX, maxY}));
