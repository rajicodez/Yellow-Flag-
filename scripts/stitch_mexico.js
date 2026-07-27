import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);

// Extract the original points as objects
const orig = [];
for (let i = 0; i < pts.length; i += 2) {
  orig.push({ x: pts[i], y: pts[i+1] });
}

// Build the new path array
const fixed = [];

// 1. Start to straight before T4 (Idx 0 to 187)
for (let i = 0; i <= 187; i++) {
  fixed.push(orig[i]);
}

// 2. Interpolate a few points from 187 to 250 to make it smooth if needed,
// but let's just directly connect to 250 since it's a straight.
// 250 is (297.38, 261.33). 187 is (323.96, 246.56).
// Let's just append 250 to 284.
for (let i = 250; i <= 284; i++) {
  fixed.push(orig[i]);
}

// 3. Connect T6 exit (284) to T7 (200).
// Let's add a few interpolated points to make the rise vertical and smooth.
const t6_exit = orig[284];
const t7_entry = orig[200];
const rise_steps = 5;
for(let i=1; i<rise_steps; i++){
  fixed.push({
    x: t6_exit.x + (t7_entry.x - t6_exit.x) * (i / rise_steps),
    y: t6_exit.y + (t7_entry.y - t6_exit.y) * (i / rise_steps)
  });
}

// 4. Esses (T7 to T12) -> Idx 200 to 231
for (let i = 200; i <= 231; i++) {
  fixed.push(orig[i]);
}

// 5. Connect T12 exit (231) to Stadium (288).
const t12_exit = orig[231];
const stadium = orig[288];
const str_steps = 8;
for(let i=1; i<str_steps; i++){
  fixed.push({
    x: t12_exit.x + (stadium.x - t12_exit.x) * (i / str_steps),
    y: t12_exit.y + (stadium.y - t12_exit.y) * (i / str_steps)
  });
}

// 6. Stadium to finish -> Idx 288 to end
for (let i = 288; i < orig.length; i++) {
  fixed.push(orig[i]);
}

// Intersection test
function ccw(A, B, C) {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersect(p1, p2, p3, p4) {
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

let ix = 0;
// close loop
fixed.push(fixed[0]);

for (let i = 0; i < fixed.length - 1; i++) {
  for (let j = i + 2; j < fixed.length - 1; j++) {
    if (i === 0 && j === fixed.length - 2) continue;
    if (intersect(fixed[i], fixed[i+1], fixed[j], fixed[j+1])) {
      console.log('Intersection between seg', i, 'and', j, 'at', fixed[i], fixed[j]);
      ix++;
    }
  }
}

console.log('Total intersections after fix:', ix);

// Output the new SVG path to check
let d = `M ${fixed[0].x} ${fixed[0].y} `;
for(let i=1; i<fixed.length-1; i++){
  d += `L ${fixed[i].x} ${fixed[i].y} `;
}
d += 'Z';
fs.writeFileSync('scripts/fixed_mexico_d.txt', d);
