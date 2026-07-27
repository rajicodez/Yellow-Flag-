import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);
const p1x = pts[0], p1y = pts[1];
const p2x = pts[pts.length - 2], p2y = pts[pts.length - 1];
const d = Math.hypot(p1x - p2x, p1y - p2y);
console.log('Distance between start and end in current SVG:', d);

const loopPts = JSON.parse(fs.readFileSync('monaco_loop.json', 'utf8'));
const loop = [];
const visited = new Array(loopPts.length).fill(false);
let bestStart = 0;
let bestDist = Infinity;
for (let i = 0; i < loopPts.length; i++) {
  const d2 = Math.hypot(loopPts[i].x - 400, loopPts[i].y - 450);
  if (d2 < bestDist) {
    bestDist = d2;
    bestStart = i;
  }
}

let curr = bestStart;
visited[curr] = true;
loop.push(loopPts[curr]);

for (let step = 1; step < loopPts.length; step++) {
  let next = -1;
  let minDist = Infinity;
  for (let i = 0; i < loopPts.length; i++) {
    if (!visited[i]) {
      const d2 = Math.hypot(loopPts[curr].x - loopPts[i].x, loopPts[curr].y - loopPts[i].y);
      if (d2 < minDist) {
        minDist = d2;
        next = i;
      }
    }
  }
  
  if (next !== -1) {
    if (minDist > 10) {
      console.log(`Large jump ${minDist} at step ${step}. Truncating loop!`);
      break;
    }
    visited[next] = true;
    loop.push(loopPts[next]);
    curr = next;
  }
}

console.log('Truncated loop size:', loop.length);

const distClosure = Math.hypot(loop[0].x - loop[loop.length-1].x, loop[0].y - loop[loop.length-1].y);
console.log('Truncated loop closure distance:', distClosure);

// Verify self-intersections of truncated loop
const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
const intersect = (p1, p2, p3, p4) => ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);

let intersections = 0;
// subsample to check intersections faster and ignore adjacent segments
const sub = [];
for (let i = 0; i < loop.length; i+=5) sub.push(loop[i]);
for (let i = 0; i < sub.length; i++) {
  const p1 = sub[i];
  const p2 = sub[(i + 1) % sub.length];
  for (let j = i + 2; j < sub.length; j++) {
    if (i === 0 && j === sub.length - 1) continue;
    const p3 = sub[j];
    const p4 = sub[(j + 1) % sub.length];
    if (intersect(p1, p2, p3, p4)) intersections++;
  }
}
console.log('Self-intersections in truncated loop:', intersections);

