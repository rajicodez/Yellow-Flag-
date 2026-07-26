import fs from 'fs';

const d = fs.readFileSync('src/assets/tracks/suzuka.svg', 'utf8');
const pathD = d.match(/d="([^"]+)"/)[1];
const pts = pathD.match(/[0-9.]+/g).map(Number);
const loop = [];
for (let i = 0; i < pts.length; i+=2) {
  loop.push({x: pts[i], y: pts[i+1]});
}

function intersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

let intersections = [];
for (let i = 0; i < loop.length; i++) {
  const p1 = loop[i];
  const p2 = loop[(i + 1) % loop.length];
  
  for (let j = i + 2; j < loop.length; j++) {
    if (i === 0 && j === loop.length - 1) continue; // adjacent
    
    const p3 = loop[j];
    const p4 = loop[(j + 1) % loop.length];
    
    if (intersect(p1, p2, p3, p4)) {
      intersections.push({i, j});
    }
  }
}

console.log(`Found ${intersections.length} intersections.`);
if (intersections.length > 0) {
  console.log('Intersection segments:', intersections);
}

// Ensure there is exactly 1 intersection cluster (the crossover)
let clusters = 1;
for (let k = 1; k < intersections.length; k++) {
  const prev = intersections[k-1];
  const curr = intersections[k];
  // if indices are not continuous, it's a new cluster
  if (Math.abs(curr.i - prev.i) > 2 || Math.abs(curr.j - prev.j) > 2) {
    clusters++;
  }
}

console.log(`Number of intersection clusters: ${clusters}`);
