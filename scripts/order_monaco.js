import fs from 'fs';

const {w, h, mask} = JSON.parse(fs.readFileSync('monaco_mask_clean.json', 'utf8'));

// Find all points in mask
const pts = [];
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (mask[y * w + x] === 1) {
      pts.push({x, y});
    }
  }
}

// Sample points to reduce density (e.g. keep 1 in every 5x5 block)
const grid = new Map();
for (const p of pts) {
  const gx = Math.floor(p.x / 4);
  const gy = Math.floor(p.y / 4);
  const key = `${gx},${gy}`;
  if (!grid.has(key)) {
    grid.set(key, {x: 0, y: 0, count: 0});
  }
  const cell = grid.get(key);
  cell.x += p.x;
  cell.y += p.y;
  cell.count++;
}

const sampled = [];
for (const cell of grid.values()) {
  sampled.push({
    x: cell.x / cell.count,
    y: cell.y / cell.count
  });
}

console.log(`Sampled ${sampled.length} points from ${pts.length} mask points`);

// MST on sampled points with distance < 20
const numRem = sampled.length;
const edges = [];
for (let i = 0; i < numRem; i++) {
  for (let j = i + 1; j < numRem; j++) {
    const d = Math.hypot(sampled[i].x - sampled[j].x, sampled[i].y - sampled[j].y);
    if (d < 6) {
      edges.push({ u: i, v: j, d });
    }
  }
}
edges.sort((a, b) => a.d - b.d);

const parent = new Array(numRem).fill(0).map((_, i) => i);
function find(i) {
  if (parent[i] === i) return i;
  return parent[i] = find(parent[i]);
}

const mstAdj = Array.from({length: numRem}, () => []);
for (const edge of edges) {
  const rootI = find(edge.u);
  const rootJ = find(edge.v);
  if (rootI !== rootJ) {
    parent[rootI] = rootJ;
    mstAdj[edge.u].push({to: edge.v, d: edge.d});
    mstAdj[edge.v].push({to: edge.u, d: edge.d});
  }
}

// Longest path in MST
function bfs(start) {
  const dist = new Array(numRem).fill(-1);
  const par = new Array(numRem).fill(-1);
  const q = [start];
  dist[start] = 0;
  
  let head = 0;
  let maxDist = 0;
  let furthest = start;
  
  while (head < q.length) {
    const curr = q[head++];
    for (const edge of mstAdj[curr]) {
      if (dist[edge.to] === -1) {
        dist[edge.to] = dist[curr] + edge.d;
        par[edge.to] = curr;
        q.push(edge.to);
        if (dist[edge.to] > maxDist) {
          maxDist = dist[edge.to];
          furthest = edge.to;
        }
      }
    }
  }
  return { furthest, parent: par };
}

let bestStart = 0;
let bestDist = Infinity;
for (let i = 0; i < numRem; i++) {
  const d = Math.hypot(sampled[i].x - 400, sampled[i].y - 450);
  if (d < bestDist) {
    bestDist = d;
    bestStart = i;
  }
}

const r1 = bfs(bestStart);
const r2 = bfs(r1.furthest);

const loop = [];
let currNode = r2.furthest;
while (currNode !== -1) {
  loop.push(sampled[currNode]);
  currNode = r2.parent[currNode];
}

console.log(`Generated path of size ${loop.length}`);

// We need to ensure the loop goes clockwise.
let area = 0;
for (let i = 0; i < loop.length; i++) {
  const a = loop[i];
  const b = loop[(i + 1) % loop.length];
  area += (b.x - a.x) * (b.y + a.y);
}
if (area < 0) {
  console.log('Reversing to clockwise');
  loop.reverse();
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

const simplified = rdp(loop, 2);

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
