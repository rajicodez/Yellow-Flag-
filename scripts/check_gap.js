import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);

const loop = [];
for (let i = 0; i < pts.length; i+=2) {
  loop.push({x: pts[i], y: pts[i+1]});
}
loop.push(loop[0]);

function distToSegment(p, v, w) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

let minDist = Infinity;
let closestPair = null;

for (let i = 0; i < loop.length - 1; i++) {
  const p1 = loop[i];
  const p2 = loop[i+1];
  for (let j = i + 15; j < loop.length - 1; j++) {
    // Avoid checking endpoints that wrap around (i=0, j=end)
    if (i < 5 && j > loop.length - 15) continue;
    
    const p3 = loop[j];
    const p4 = loop[j+1];
    
    const d1 = distToSegment(p1, p3, p4);
    const d2 = distToSegment(p2, p3, p4);
    const d3 = distToSegment(p3, p1, p2);
    const d4 = distToSegment(p4, p1, p2);
    
    const d = Math.min(d1, d2, d3, d4);
    if (d < minDist) {
      minDist = d;
      closestPair = {i, j, d};
    }
  }
}

console.log(`Minimum centreline distance: ${minDist}`);
console.log(`Between segment ${closestPair.i} and ${closestPair.j}`);

// The global road width is set to 52 in racerTracks.js
const visualRoadWidth = 52;
const visibleGap = minDist - visualRoadWidth;
console.log(`Visible Gap (assuming width 52): ${visibleGap}`);
