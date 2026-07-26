const fs = require('fs');

const svg = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf-8');
const match = svg.match(/d="([^"]+)"/);
if (!match) {
  console.log("No path found");
  process.exit(1);
}

const path = match[1];
const parts = path.split(/ [ML] /).filter(Boolean);
const pts = parts.map(p => {
  const [x, y] = p.replace(/[M L Z]/g, '').trim().split(' ').map(Number);
  if (!isNaN(x) && !isNaN(y)) return { x, y };
}).filter(Boolean);

console.log(`Loaded ${pts.length} points.`);

function getDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

let minDist = Infinity;
let intersections = 0;

// Since this is scaled to the game's coordinate system (bounding box width 800),
// let's see the minimum distance between non-adjacent points.
// A distance > 10 in SVG space means > 10 in game space (depending on fit transform).
// Let's just find the minimum distance and print it.

for (let i = 0; i < pts.length; i++) {
  for (let j = i + 10; j < pts.length; j++) {
    // Avoid checking points near the loop wrap-around
    if (Math.min(j - i, pts.length - j + i) < 15) continue;
    
    // Point-to-point distance approximation is fine since segments are very small (subsampled)
    const d = getDist(pts[i], pts[j]);
    if (d < minDist) {
      minDist = d;
    }
    
    // Also check segment intersection roughly
    if (j < pts.length - 1 && i < pts.length - 1) {
      const A = pts[i];
      const B = pts[i+1];
      const C = pts[j];
      const D = pts[j+1];
      
      const ccw = (p1, p2, p3) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
      const intersect = ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
      if (intersect) {
        intersections++;
        console.log(`Intersection between segments ${i} and ${j}`);
      }
    }
  }
}

console.log(`Minimum clearance distance: ${minDist}`);
console.log(`Self-intersections: ${intersections}`);
