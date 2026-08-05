import fs from 'fs';

// We'll extract the exact logic from racerTracks.js to simulate what fails.
const svgStr = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const dMatch = svgStr.match(/d="([^"]+)"/);
const baseD = dMatch[1];

function tokenizePath(d) {
  return d.match(/[a-df-zA-DF-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
}
function sampleLine(out, ax, ay, bx, by) {
  const steps = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 12));
  for (let i = 1; i <= steps; i++) {
    out.push({ x: ax + (bx - ax) * i / steps, y: ay + (by - ay) * i / steps });
  }
}
function samplePathD(d) {
  const tokens = tokenizePath(d);
  let pts = [];
  let cx = 0, cy = 0;
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      cx = parseFloat(tokens[i++]); cy = parseFloat(tokens[i++]);
      pts.push({ x: cx, y: cy });
    } else if (cmd === 'L') {
      const nx = parseFloat(tokens[i++]); const ny = parseFloat(tokens[i++]);
      sampleLine(pts, cx, cy, nx, ny);
      cx = nx; cy = ny;
    } else if (cmd === 'Z') {
      sampleLine(pts, cx, cy, pts[0].x, pts[0].y);
    }
  }
  return pts;
}

const rawPts = samplePathD(baseD);

// Minimal getSmoothPolyline simulation (just simple chaikin or linear for now, to check lengths)
// Actually, I can just read racerTracks.js getSmoothPolyline logic:
function getSmoothPolyline(points, iterations = 2) {
  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const n = current.length;
    for (let i = 0; i < n; i++) {
      const p1 = current[i];
      const p2 = current[(i + 1) % n];
      next.push({ x: 0.75 * p1.x + 0.25 * p2.x, y: 0.75 * p1.y + 0.25 * p2.y });
      next.push({ x: 0.25 * p1.x + 0.75 * p2.x, y: 0.25 * p1.y + 0.75 * p2.y });
    }
    current = next;
  }
  return current;
}

const pts = getSmoothPolyline(rawPts);
const n = pts.length;
console.log("Smoothed points length:", n);

const distPointToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t; const qy = ay + dy * t;
  return Math.hypot(px - qx, py - qy);
};
const distSegmentToSegment = (a1, a2, b1, b2) => Math.min(
  distPointToSegment(a1.x, a1.y, b1.x, b1.y, b2.x, b2.y),
  distPointToSegment(a2.x, a2.y, b1.x, b1.y, b2.x, b2.y),
  distPointToSegment(b1.x, b1.y, a1.x, a1.y, a2.x, a2.y),
  distPointToSegment(b2.x, b2.y, a1.x, a1.y, a2.x, a2.y)
);

let minD = Infinity;
let failI = -1, failJ = -1;
for (let i = 0; i < n; i++) {
  for (let j = i + 15; j < n; j++) {
    if (n - j + i < 15) continue; 
    const d = distSegmentToSegment(pts[i], pts[(i+1)%n], pts[j], pts[(j+1)%n]);
    if (d < minD) {
      minD = d;
      failI = i;
      failJ = j;
    }
  }
}

// Calculate arc length between failI and failJ
let arcLength = 0;
for (let k = failI; k < failJ; k++) {
  arcLength += Math.hypot(pts[(k+1)%n].x - pts[k].x, pts[(k+1)%n].y - pts[k].y);
}

// Get minX, maxX etc to calculate scale
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
pts.forEach(p => {
  if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
  if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
});
const width = 58;
const margin = width / 2 + 30;
const scale = Math.min((960 - margin * 2) / (maxX - minX), (600 - margin * 2) / (maxY - minY));

console.log("Scale:", scale);
console.log("MinD (SVG space):", minD);
console.log("MinCanvasDist:", minD * scale);
console.log(`Indices: i=${failI}, j=${failJ}, Index diff=${failJ - failI}`);
console.log("Arc length between them:", arcLength);
