import fs from 'fs';

const d = fs.readFileSync('mexico.svg', 'utf8');
const pathD = d.match(/d="([^"]+)"/)[1];
const pts = pathD.match(/[0-9.]+/g).map(Number);

// Smooth the points lightly to remove zig-zags from TSP
const smoothPts = [];
const N = pts.length / 2;
for(let i=0; i<N; i++) {
  smoothPts.push({x: pts[2*i], y: pts[2*i+1]});
}

const smoothClosed = (arr, passes) => {
  let cur = arr;
  for (let p = 0; p < passes; p++) {
    cur = cur.map((v, i) => {
      const prev = cur[(i - 1 + cur.length) % cur.length];
      const next = cur[(i + 1) % cur.length];
      return { x: (prev.x + v.x * 2 + next.x) / 4, y: (prev.y + v.y * 2 + next.y) / 4 };
    });
  }
  return cur;
};

const smoothed = smoothClosed(smoothPts, 3);

// Simplify path (downsample to ~300 points)
const simplified = [];
for (let i = 0; i < smoothed.length; i++) {
  // Just keep them all for accuracy, or maybe filter points that are too close
  if (i === 0 || Math.hypot(smoothed[i].x - smoothed[i-1].x, smoothed[i].y - smoothed[i-1].y) > 1.0) {
    simplified.push(smoothed[i]);
  }
}

// Ensure first and last are connected
let minX = 1000, maxX = 0, minY = 1000, maxY = 0;
for(let p of simplified) {
  minX = Math.min(minX, p.x);
  maxX = Math.max(maxX, p.x);
  minY = Math.min(minY, p.y);
  maxY = Math.max(maxY, p.y);
}

// Add padding as requested (approx 3-5%)
const padX = (maxX - minX) * 0.05;
const padY = (maxY - minY) * 0.05;

let finalPath = '';
for(let i=0; i<simplified.length; i++) {
  const p = simplified[i];
  const nx = (p.x - minX + padX).toFixed(2);
  const ny = (p.y - minY + padY).toFixed(2);
  finalPath += (i === 0 ? 'M ' : 'L ') + nx + ' ' + ny + ' ';
}
finalPath += 'Z';

const w = Math.ceil(maxX - minX + padX * 2);
const h = Math.ceil(maxY - minY + padY * 2);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <path d="${finalPath}" />
</svg>`;

fs.writeFileSync('src/assets/tracks/mexico.svg', svg);
console.log('Saved to src/assets/tracks/mexico.svg');
console.log(`Bounds: minX: ${minX}, maxX: ${maxX}, minY: ${minY}, maxY: ${maxY}`);
console.log(`Final size: ${w}x${h}`);
