import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);

const loop = [];
for (let i = 0; i < pts.length; i+=2) {
  loop.push({x: pts[i], y: pts[i+1]});
}
// Add the start point to the end to close the loop for math checks
loop.push(loop[0]);

const p1x = loop[0].x, p1y = loop[0].y;
const p2x = loop[loop.length - 2].x, p2y = loop[loop.length - 2].y;
const d = Math.hypot(p1x - p2x, p1y - p2y);
console.log('Distance between first and last point before Z:', d);

const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
const intersect = (p1, p2, p3, p4) => ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);

let intersections = 0;
for (let i = 0; i < loop.length - 1; i++) {
  const p1 = loop[i];
  const p2 = loop[i + 1];
  
  for (let j = i + 2; j < loop.length - 1; j++) {
    if (i === 0 && j === loop.length - 2) continue; // adjacent
    const p3 = loop[j];
    const p4 = loop[j + 1];
    if (intersect(p1, p2, p3, p4)) intersections++;
  }
}
console.log('Self-intersections:', intersections);

let tightInversions = 0;
for (let i = 0; i < loop.length - 2; i++) {
  const p1 = loop[i];
  const p2 = loop[i + 1];
  const p3 = loop[i + 2];
  const v1x = p2.x - p1.x;
  const v1y = p2.y - p1.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot / mag)));
  if (angle > Math.PI * 0.9) tightInversions++;
}
console.log('180-degree inversions:', tightInversions);
