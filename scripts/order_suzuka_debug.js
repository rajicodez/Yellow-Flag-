import fs from 'fs';

const pts = JSON.parse(fs.readFileSync('suzuka_skeleton.json', 'utf8'));

const comps = [[], [], []];
for (const p of pts) {
  if (p.comp < 3) comps[p.comp].push(p);
}

function orderComponent(compPts) {
  // Find endpoints (approx by finding max dist pair)
  let p1 = 0, p2 = 0, maxDist = 0;
  for (let i = 0; i < compPts.length; i+=5) {
    for (let j = i + 1; j < compPts.length; j+=5) {
      const d = Math.hypot(compPts[i].x - compPts[j].x, compPts[i].y - compPts[j].y);
      if (d > maxDist) {
        maxDist = d;
        p1 = i;
        p2 = j;
      }
    }
  }

  // Greedy NN from p1
  const visited = new Array(compPts.length).fill(false);
  const path = [];
  let curr = p1;
  visited[curr] = true;
  path.push(compPts[curr]);

  for (let step = 1; step < compPts.length; step++) {
    let next = -1;
    let minDist = Infinity;
    for (let j = 0; j < compPts.length; j++) {
      if (!visited[j]) {
        const d = Math.hypot(compPts[curr].x - compPts[j].x, compPts[curr].y - compPts[j].y);
        if (d < minDist) {
          minDist = d;
          next = j;
        }
      }
    }
    visited[next] = true;
    path.push(compPts[next]);
    curr = next;
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

const connections = [];
while (availableEndpoints.length > 0) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < availableEndpoints.length; i++) {
    for (let j = i + 1; j < availableEndpoints.length; j++) {
      const e1 = availableEndpoints[i];
      const e2 = availableEndpoints[j];
      if (e1.comp !== e2.comp) {
        const d = Math.hypot(e1.p.x - e2.p.x, e1.p.y - e2.p.y);
        if (d < bestDist) {
          bestDist = d;
          best = {i, j, e1, e2};
        }
      }
    }
  }
  if (!best) break; 
  connections.push(best);
  availableEndpoints = availableEndpoints.filter(e => e !== best.e1 && e !== best.e2);
}

console.log(connections); const fullLoop = [];
let currComp = connections[0].e1.comp;
let currEnd = connections[0].e1.end; 

for (let step = 0; step < 3; step++) {
  const p = paths[currComp];
  if (currEnd === 0) {
    for (let i = 0; i < p.length; i++) fullLoop.push(p[i]);
  } else {
    for (let i = p.length - 1; i >= 0; i--) fullLoop.push(p[i]);
  }
  
  const otherEnd = 1 - currEnd;
  const nextConn = connections.find(c => (c.e1.comp === currComp && c.e1.end === otherEnd) || (c.e2.comp === currComp && c.e2.end === otherEnd));
  
  if (!nextConn) break;
  
  const nextE = nextConn.e1.comp === currComp ? nextConn.e2 : nextConn.e1;
  currComp = nextE.comp;
  currEnd = nextE.end;
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
