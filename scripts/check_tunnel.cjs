const fs = require('fs');

const svg = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf-8');
const match = svg.match(/d="([^"]+)"/);
const path = match[1];
const parts = path.split(/ [ML] /).filter(Boolean);
const pts = parts.map(p => {
  const [x, y] = p.replace(/[M L Z]/g, '').trim().split(' ').map(Number);
  if (!isNaN(x) && !isNaN(y)) return { x, y };
}).filter(Boolean);

let max_x = 0;
let portier_idx = 0;
for(let i=0; i<pts.length; i++){
  if(pts[i].x > max_x) {
    max_x = pts[i].x;
    portier_idx = i;
  }
}

// Chicane is on the bottom straight, after Portier, where X decreases rapidly and Y jumps.
// Let's find the first local minimum of Y after Portier.
let chicane_idx = portier_idx;
for(let i=portier_idx; i<portier_idx+100; i++){
  const idx = i % pts.length;
  if(pts[idx].x < 400 && pts[idx].y < 165) {
    chicane_idx = idx;
    break;
  }
}

console.log(`Total points: ${pts.length}`);
console.log(`Portier index: ${portier_idx}, progress: ${portier_idx / pts.length}`);
console.log(`Chicane index: ${chicane_idx}, progress: ${chicane_idx / pts.length}`);
