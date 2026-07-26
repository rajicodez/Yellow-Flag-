import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);
const loop = [];
for (let i = 0; i < pts.length; i+=2) {
  loop.push({x: pts[i], y: pts[i+1]});
}
loop.push(loop[0]);

function fitTransform(pts, padding) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const scale = Math.min((960 - padding * 2) / w, (600 - padding * 2) / h);
  const tx = (960 - w * scale) / 2 - minX * scale;
  const ty = (600 - h * scale) / 2 - minY * scale;
  return { scale, tx, ty };
}

const { scale, tx, ty } = fitTransform(loop, 52 / 2 + 30);
const scaledLoop = loop.map(p => ({ x: p.x * scale + tx, y: p.y * scale + ty }));

function distToSegment(p, v, w) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

// Find top path (Mirabeau) and bottom path (Portier)
// We know Hairpin is around the max X.
let maxXIdx = 0;
for (let i = 0; i < scaledLoop.length; i++) {
  if (scaledLoop[i].x > scaledLoop[maxXIdx].x) {
    maxXIdx = i;
  }
}

console.log(`Hairpin is near index ${maxXIdx} (X=${scaledLoop[maxXIdx].x.toFixed(1)})`);

let minD = Infinity;
// Compare points before hairpin with points after hairpin
for (let i = Math.max(0, maxXIdx - 20); i < maxXIdx; i++) {
  const p1 = scaledLoop[i];
  const p2 = scaledLoop[i+1];
  for (let j = maxXIdx + 5; j < Math.min(scaledLoop.length - 1, maxXIdx + 25); j++) {
    const p3 = scaledLoop[j];
    const p4 = scaledLoop[j+1];
    const d = distToSegment(p1, p3, p4);
    if (d < minD) minD = d;
  }
}

console.log(`Distance between Mirabeau arm and Portier arm: ${minD.toFixed(2)}`);
console.log(`With road width 52, overlap is ${(52 - minD).toFixed(2)}`);
