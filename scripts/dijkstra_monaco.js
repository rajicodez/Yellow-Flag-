import fs from 'fs';

const pts = JSON.parse(fs.readFileSync('monaco_loop.json', 'utf8'));
const n = pts.length;

// Build adjacency using spatial hashing
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

// Pick A and B as two adjacent nodes
let nodeA = 0;
let nodeB = adj[0][0];

// Remove edge (A, B)
const adjA = adj[nodeA].filter(x => x !== nodeB);
const adjB = adj[nodeB].filter(x => x !== nodeA);
adj[nodeA] = adjA;
adj[nodeB] = adjB;

// Dijkstra from A to B
const dist = new Array(n).fill(Infinity);
const parent = new Array(n).fill(-1);
dist[nodeA] = 0;

// Min-priority queue (naive array is fine for 5800 nodes if we just scan, or we can use BFS since edge weights are 1 or sqrt(2))
// Edge weights are Euclidean distance
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
  console.log("No path found! The loop was disconnected by removing one edge.");
  process.exit(1);
}

const path = [];
let curr = nodeB;
while (curr !== -1) {
  path.push(pts[curr]);
  curr = parent[curr];
}
// path is from B to A. 
// A is adjacent to B, so this is a closed loop!

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

// RDP Simplification
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

// Apply RDP and shift the array so the start is at the correct position (x=400, y=450 approx)
let bestStartIdx = 0;
let bestDist = Infinity;
for (let i = 0; i < path.length; i++) {
  const d = Math.hypot(path[i].x - 400, path[i].y - 450);
  if (d < bestDist) {
    bestDist = d;
    bestStartIdx = i;
  }
}
const shiftedPath = path.slice(bestStartIdx).concat(path.slice(0, bestStartIdx));

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
