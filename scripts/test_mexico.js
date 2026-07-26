import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);
const loop = [];
for (let i = 0; i < pts.length; i += 2) {
  loop.push({ x: pts[i], y: pts[i+1] });
}
loop.push(loop[0]); // close loop

function ccw(A, B, C) {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersect(p1, p2, p3, p4) {
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

let ix = 0;
for (let i = 0; i < loop.length - 1; i++) {
  for (let j = i + 2; j < loop.length - 1; j++) {
    // Exclude wrap-around adjacency
    if (i === 0 && j === loop.length - 2) continue;
    if (intersect(loop[i], loop[i+1], loop[j], loop[j+1])) {
      console.log('Intersection between seg', i, 'and', j);
      ix++;
    }
  }
}
console.log('Total intersections:', ix);
