import fs from 'fs';

const {pts, minX, minY, maxX, maxY} = JSON.parse(fs.readFileSync('monaco_loop_v2.json', 'utf8'));
const n = pts.length;

// Build adjacency
const grid = new Map();
for (let i = 0; i < n; i++) grid.set(`${pts[i].x},${pts[i].y}`, i);

const adj = Array.from({length: n}, () => []);
for (let i = 0; i < n; i++) {
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

// Find Start point (Approx X=350, Y=350 on this map, but let's just pick leftmost)
let startNode = 0;
for (let i = 1; i < n; i++) {
  if (pts[i].x < pts[startNode].x) {
    startNode = i;
  }
}

let nodeA = startNode;
let nodeB = adj[startNode][0];

// Remove edge (A, B)
adj[nodeA] = adj[nodeA].filter(x => x !== nodeB);
adj[nodeB] = adj[nodeB].filter(x => x !== nodeA);

// BFS from A to B (all edges have weight 1 or sqrt(2), BFS finds shortest path in terms of segments)
// Or use Dijkstra
const dist = new Array(n).fill(Infinity);
const parent = new Array(n).fill(-1);
dist[nodeA] = 0;

const q = new Set();
for (let i = 0; i < n; i++) q.add(i);

while (q.size > 0) {
  let u = -1;
  let minD = Infinity;
  for (const v of q) {
    if (dist[v] < minD) {
      minD = dist[v];
      u = v;
    }
  }
  
  if (u === -1 || u === nodeB) break;
  q.delete(u);
  
  for (const v of adj[u]) {
    if (q.has(v)) {
      const d = Math.hypot(pts[u].x - pts[v].x, pts[u].y - pts[v].y);
      const alt = dist[u] + d;
      if (alt < dist[v]) {
        dist[v] = alt;
        parent[v] = u;
      }
    }
  }
}

if (dist[nodeB] === Infinity) {
  console.log("No path found! The loop was disconnected.");
  process.exit(1);
}

const path = [];
let curr = nodeB;
while (curr !== -1) {
  path.push(pts[curr]);
  curr = parent[curr];
}

console.log(`Extracted loop of size ${path.length}`);

// Ensure clockwise
let area = 0;
for (let i = 0; i < path.length; i++) {
  const a = path[i];
  const b = path[(i + 1) % path.length];
  area += (b.x - a.x) * (b.y + a.y);
}
if (area < 0) {
  console.log('Reversing to clockwise');
  path.reverse();
}

// Subsample heavily because RDP can cause self-intersections on dense tight corners
const subsampled = [];
for (let i = 0; i < path.length; i += 2) {
  subsampled.push(path[i]);
}

function rdp(points, epsilon) {
  if (points.length < 3) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  
  for (let i = 1; i < end; i++) {
    const p = points[i];
    const a = points[0];
    const b = points[end];
    
    const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
    const den = Math.hypot(b.y - a.y, b.x - a.x);
    const d = den === 0 ? Math.hypot(p.x - a.x, p.y - a.y) : num / den;
    
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  
  if (dmax > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

// Find a good start point (around x=400, y=450 on the normalized bounds)
// The original map is 1500x940. Bounds X=148-1357, Y=94-615.
// Start/finish is on the left straight, roughly X=350, Y=350.
let bestStartIdx = 0;
let bestDist = Infinity;
for (let i = 0; i < subsampled.length; i++) {
  const d = Math.hypot(subsampled[i].x - 350, subsampled[i].y - 350);
  if (d < bestDist) {
    bestDist = d;
    bestStartIdx = i;
  }
}
const shiftedPath = subsampled.slice(bestStartIdx).concat(subsampled.slice(0, bestStartIdx));

const simplified = rdp(shiftedPath.concat([shiftedPath[0]]), 1.5);
simplified.pop(); // remove duplicate closing point

console.log(`Simplified to ${simplified.length} points`);

let minBoundsX = Infinity, maxBoundsX = -Infinity;
let minBoundsY = Infinity, maxBoundsY = -Infinity;
for (const p of simplified) {
  minBoundsX = Math.min(minBoundsX, p.x);
  maxBoundsX = Math.max(maxBoundsX, p.x);
  minBoundsY = Math.min(minBoundsY, p.y);
  maxBoundsY = Math.max(maxBoundsY, p.y);
}
const width = maxBoundsX - minBoundsX;
const height = maxBoundsY - minBoundsY;
const aspect = width / height;

console.log(`Final bounds: minX=${minBoundsX}, maxX=${maxBoundsX}, minY=${minBoundsY}, maxY=${maxBoundsY}`);
console.log(`Final width: ${width}, height: ${height}, aspect: ${aspect}`);

let svgPath = '';
for (let i = 0; i < simplified.length; i++) {
  const p = simplified[i];
  const nx = p.x - minBoundsX;
  const ny = p.y - minBoundsY;
  if (i === 0) svgPath += `M ${nx} ${ny} `;
  else svgPath += `L ${nx} ${ny} `;
}
svgPath += 'Z';

const paddedWidth = width * 1.05;
const paddedHeight = height * 1.05;
const paddingX = width * 0.025;
const paddingY = height * 0.025;

const svgOut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-paddingX} ${-paddingY} ${paddedWidth} ${paddedHeight}">
  <path d="${svgPath}" fill="none" stroke="red" stroke-width="4" stroke-linejoin="round" />
</svg>`;

fs.writeFileSync('src/assets/tracks/monaco.svg', svgOut);
console.log('Saved src/assets/tracks/monaco.svg');

// Output verification script
const verifyScript = `
import fs from 'fs';
const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?/g).map(Number);
const loop = [];
for (let i = 0; i < pts.length; i+=2) loop.push({x: pts[i], y: pts[i+1]});
loop.push(loop[0]);
const p1x = loop[0].x, p1y = loop[0].y;
const p2x = loop[loop.length - 2].x, p2y = loop[loop.length - 2].y;
console.log('Distance between first and last point before Z:', Math.hypot(p1x - p2x, p1y - p2y));
const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
const intersect = (p1, p2, p3, p4) => ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
let intersections = 0;
for (let i = 0; i < loop.length - 1; i++) {
  const p1 = loop[i], p2 = loop[i + 1];
  for (let j = i + 2; j < loop.length - 1; j++) {
    if (i === 0 && j === loop.length - 2) continue;
    const p3 = loop[j], p4 = loop[j + 1];
    if (intersect(p1, p2, p3, p4)) intersections++;
  }
}
console.log('Self-intersections:', intersections);
`;
fs.writeFileSync('scripts/validate_monaco_v2.js', verifyScript);
