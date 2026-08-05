import fs from 'fs';

const {w, h, mask} = JSON.parse(fs.readFileSync('monaco_mask_clean.json', 'utf8'));

// Find a starting pixel on the outer boundary.
// We can scan from left to right, middle height, to find the first pixel.
let startX = -1;
let startY = -1;
for (let y = Math.floor(h / 2); y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (mask[y * w + x] === 1) {
      startX = x;
      startY = y;
      break;
    }
  }
  if (startX !== -1) break;
}

console.log(`Start tracing from x=${startX}, y=${startY}`);

// Moore neighborhood tracing
// Directions: 0: up, 1: up-right, 2: right, 3: down-right, 4: down, 5: down-left, 6: left, 7: up-left
const dirs = [
  {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1},
  {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
];

let currX = startX;
let currY = startY;
let currDir = 0;

const boundary = [];
const visitedStr = new Set();

while (true) {
  boundary.push({x: currX, y: currY});
  visitedStr.add(`${currX},${currY}`);
  
  // Search for the next boundary pixel
  // Start from the direction we came from, minus 2 (so we check "left" of forward direction)
  let found = false;
  let searchDir = (currDir + 6) % 8; // Turn left 90 degrees
  
  for (let i = 0; i < 8; i++) {
    const dir = (searchDir + i) % 8;
    const nx = currX + dirs[dir].x;
    const ny = currY + dirs[dir].y;
    
    if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx] === 1) {
      currX = nx;
      currY = ny;
      currDir = dir;
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log("No next pixel found, stuck!");
    break;
  }
  
  if (currX === startX && currY === startY) {
    break;
  }
}

console.log(`Traced boundary of size ${boundary.length}`);

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

// Subsample before RDP
const subsampled = [];
for (let i = 0; i < boundary.length; i+=3) {
  subsampled.push(boundary[i]);
}

const simplified = rdp(subsampled.concat([subsampled[0]]), 2.5);
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
