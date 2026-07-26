import fs from 'fs';

const pts = JSON.parse(fs.readFileSync('suzuka_skeleton.json', 'utf8'));

const comps = [[], [], []];
for (const p of pts) {
  if (p.comp < 3) comps[p.comp].push(p);
}

function orderComponent(compPts) {
  const n = compPts.length;
  const adj = Array.from({length: n}, () => []);
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(compPts[i].x - compPts[j].x, compPts[i].y - compPts[j].y);
      if (d < 6.5) {
        adj[i].push({to: j, d});
        adj[j].push({to: i, d});
      }
    }
  }

  function bfs(start) {
    const dist = new Array(n).fill(-1);
    const parent = new Array(n).fill(-1);
    const q = [start];
    dist[start] = 0;
    
    let head = 0;
    let maxDist = 0;
    let furthest = start;
    
    while (head < q.length) {
      const curr = q[head++];
      for (const edge of adj[curr]) {
        if (dist[edge.to] === -1) {
          dist[edge.to] = dist[curr] + edge.d;
          parent[edge.to] = curr;
          q.push(edge.to);
          if (dist[edge.to] > maxDist) {
            maxDist = dist[edge.to];
            furthest = edge.to;
          }
        }
      }
    }
    return { furthest, parent };
  }

  const r1 = bfs(0);
  const r2 = bfs(r1.furthest);
  
  const path = [];
  let curr = r2.furthest;
  while (curr !== -1) {
    path.push(compPts[curr]);
    curr = r2.parent[curr];
  }
  return path;
}

const paths = comps.map(orderComponent);
console.log('Path lengths:', paths.map(p => p.length));

const endPts = paths.map(p => [p[0], p[p.length - 1]]);

let availableEndpoints = [
  {comp: 0, end: 0, p: endPts[0][0]}, {comp: 0, end: 1, p: endPts[0][1]},
  {comp: 1, end: 0, p: endPts[1][0]}, {comp: 1, end: 1, p: endPts[1][1]},
  {comp: 2, end: 0, p: endPts[2][0]}, {comp: 2, end: 1, p: endPts[2][1]},
];

// We have 3 paths. Each path can be traversed forward or backward.
// Let direction be 0 for forward, 1 for backward.
// Let order of paths be a permutation of [0, 1, 2].
const perms = [
  [0, 1, 2],
  [0, 2, 1] // Only need 2 permutations since cycle (0,1,2) == (1,2,0) == (2,0,1)
];

let bestCycle = null;
let bestTotalDist = Infinity;

for (const p of perms) {
  for (let d0 = 0; d0 < 2; d0++) {
    for (let d1 = 0; d1 < 2; d1++) {
      for (let d2 = 0; d2 < 2; d2++) {
        const dirs = [d0, d1, d2];
        
        // Gap 1: p[0] end -> p[1] start
        const p0_end = endPts[p[0]][dirs[0] === 0 ? 1 : 0];
        const p1_start = endPts[p[1]][dirs[1] === 0 ? 0 : 1];
        
        // Gap 2: p[1] end -> p[2] start
        const p1_end = endPts[p[1]][dirs[1] === 0 ? 1 : 0];
        const p2_start = endPts[p[2]][dirs[2] === 0 ? 0 : 1];
        
        // Gap 3: p[2] end -> p[0] start
        const p2_end = endPts[p[2]][dirs[2] === 0 ? 1 : 0];
        const p0_start = endPts[p[0]][dirs[0] === 0 ? 0 : 1];
        
        const d1_val = Math.hypot(p0_end.x - p1_start.x, p0_end.y - p1_start.y);
        const d2_val = Math.hypot(p1_end.x - p2_start.x, p1_end.y - p2_start.y);
        const d3_val = Math.hypot(p2_end.x - p0_start.x, p2_end.y - p0_start.y);
        
        const total = d1_val + d2_val + d3_val;
        if (total < bestTotalDist) {
          bestTotalDist = total;
          bestCycle = { p, dirs };
        }
      }
    }
  }
}

const fullLoop = [];
for (let i = 0; i < 3; i++) {
  const compIdx = bestCycle.p[i];
  const dir = bestCycle.dirs[i];
  const pathArr = paths[compIdx];
  if (dir === 0) {
    for (let j = 0; j < pathArr.length; j++) fullLoop.push(pathArr[j]);
  } else {
    for (let j = pathArr.length - 1; j >= 0; j--) fullLoop.push(pathArr[j]);
  }
}


const smoothClosed = (arr, passes) => {
  let cur = arr;
  for (let p = 0; p < passes; p++) {
    cur = cur.map((v, i) => {
      const prev = cur[(i - 1 + cur.length) % cur.length];
      const next = cur[(i + 1) % cur.length];
      return { x: (prev.x + v.x * 2 + next.x) / 4, y: (prev.y + v.y * 2 + next.y) / 4 };
    });
  }
  return cur;
};

const smoothed = smoothClosed(fullLoop, 5);
const simplified = [];
for (let i = 0; i < smoothed.length; i++) {
  if (i === 0 || Math.hypot(smoothed[i].x - simplified[simplified.length-1].x, smoothed[i].y - simplified[simplified.length-1].y) > 2) {
    simplified.push(smoothed[i]);
  }
}

// S/F is on the slanted straight near x:800, y:350
let bestStart = 0;
let bestDistStart = Infinity;
for (let i = 0; i < simplified.length; i++) {
  const d = Math.hypot(simplified[i].x - 800, simplified[i].y - 350);
  if (d < bestDistStart) {
    bestDistStart = d;
    bestStart = i;
  }
}

// Ensure clockwise (racing down to T1)
let pA = simplified[bestStart];
let pB = simplified[(bestStart + 5) % simplified.length];
if (pB.y < pA.y) {
  simplified.reverse();
  bestStart = simplified.length - 1 - bestStart;
}

const ordered = [...simplified.slice(bestStart), ...simplified.slice(0, bestStart)];

let minX = 1000, maxX = 0, minY = 1000, maxY = 0;
for(let p of ordered) {
  minX = Math.min(minX, p.x);
  maxX = Math.max(maxX, p.x);
  minY = Math.min(minY, p.y);
  maxY = Math.max(maxY, p.y);
}

const padX = (maxX - minX) * 0.05;
const padY = (maxY - minY) * 0.05;

let finalPath = '';
for(let i=0; i<ordered.length; i++) {
  const nx = (ordered[i].x - minX + padX).toFixed(2);
  const ny = (ordered[i].y - minY + padY).toFixed(2);
  finalPath += (i === 0 ? 'M ' : 'L ') + nx + ' ' + ny + ' ';
}
finalPath += 'Z';

const w = Math.ceil(maxX - minX + padX * 2);
const h = Math.ceil(maxY - minY + padY * 2);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <path d="${finalPath}" />
</svg>`;

fs.writeFileSync('src/assets/tracks/suzuka.svg', svg);
console.log(`Saved suzuka.svg. Bounds: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
