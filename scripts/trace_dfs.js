import fs from 'fs';

const {pts, minX, minY, maxX, maxY} = JSON.parse(fs.readFileSync('monaco_loop_v2.json', 'utf8'));

// Build adjacency
const grid = new Map();
for (let i = 0; i < pts.length; i++) grid.set(`${pts[i].x},${pts[i].y}`, i);

const adj = Array.from({length: pts.length}, () => []);
for (let i = 0; i < pts.length; i++) {
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

let startNode = 0;
let bestDist = Infinity;
for (let i = 0; i < pts.length; i++) {
  const d = Math.hypot(pts[i].x - 350, pts[i].y - 350);
  if (d < bestDist) {
    bestDist = d;
    startNode = i;
  }
}

const visited = new Array(pts.length).fill(false);
const path = [pts[startNode]];
visited[startNode] = true;
let curr = startNode;

while (true) {
  let next = -1;
  
  // Prefer degree-2 nodes first
  for (const neighbor of adj[curr]) {
    if (!visited[neighbor] && adj[neighbor].length === 2) {
      next = neighbor;
      break;
    }
  }
  
  // If no degree-2 neighbor, pick any unvisited neighbor
  if (next === -1) {
    for (const neighbor of adj[curr]) {
      if (!visited[neighbor]) {
        next = neighbor;
        break;
      }
    }
  }
  
  // If still no neighbor, we are stuck (or reached the end of a cycle, but wait, the last node will be adjacent to startNode which is visited)
  if (next === -1) {
    break;
  }
  
  visited[next] = true;
  path.push(pts[next]);
  curr = next;
}

console.log(`DFS path size: ${path.length} out of ${pts.length}`);

// Check if it closed the loop (is curr adjacent to startNode?)
let closed = false;
for (const neighbor of adj[curr]) {
  if (neighbor === startNode) {
    closed = true;
    break;
  }
}
console.log(`Loop closed? ${closed}`);

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

const subsampled = [];
for (let i = 0; i < path.length; i+=2) subsampled.push(path[i]);

const simplified = rdp(subsampled.concat([subsampled[0]]), 1.5);
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
