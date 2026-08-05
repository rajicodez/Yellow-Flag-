import fs from 'fs';

const {pts, minX, minY, maxX, maxY} = JSON.parse(fs.readFileSync('monaco_loop_v2.json', 'utf8'));

const loop = [];
const visited = new Array(pts.length).fill(false);

let bestStart = 0;
let bestDist = Infinity;
for (let i = 0; i < pts.length; i++) {
  const d = Math.hypot(pts[i].x - 350, pts[i].y - 350);
  if (d < bestDist) {
    bestDist = d;
    bestStart = i;
  }
}

let curr = bestStart;
visited[curr] = true;
loop.push(pts[curr]);

for (let step = 1; step < pts.length; step++) {
  let next = -1;
  let minDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    if (!visited[i]) {
      const d = Math.hypot(pts[curr].x - pts[i].x, pts[curr].y - pts[i].y);
      if (d < minDist) {
        minDist = d;
        next = i;
      }
    }
  }
  
  if (next !== -1) {
    if (minDist > 10) {
      console.log(`Large jump ${minDist} at step ${step}.`);
      break;
    }
    visited[next] = true;
    loop.push(pts[next]);
    curr = next;
  }
}

console.log('NN loop size:', loop.length);

const d = Math.hypot(loop[0].x - loop[loop.length-1].x, loop[0].y - loop[loop.length-1].y);
console.log('Distance between start and end:', d);

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
for (let i = 0; i < loop.length; i++) {
  const a = loop[i];
  const b = loop[(i + 1) % loop.length];
  area += (b.x - a.x) * (b.y + a.y);
}
if (area < 0) {
  console.log('Reversing to clockwise');
  loop.reverse();
}

const subsampled = [];
for (let i = 0; i < loop.length; i+=2) subsampled.push(loop[i]);

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
