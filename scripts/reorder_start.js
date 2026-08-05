import fs from 'fs';

const d = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const pathD = d.match(/d="([^"]+)"/)[1];
const pts = pathD.match(/[0-9.]+/g).map(Number);

const simplified = [];
for (let i = 0; i < pts.length; i+=2) {
  simplified.push({x: pts[i], y: pts[i+1]});
}

// Find the top straight: points with lowest Y.
// The main straight is roughly Y < 60.
// Start line is around the middle of the straight.
let bestIdx = 0;
let bestDist = Infinity;
for (let i = 0; i < simplified.length; i++) {
  const p = simplified[i];
  if (p.y < 60) {
    // Pick a point near x = 160 (start/finish)
    const dist = Math.abs(p.x - 160);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
}

// Check direction. The next point should have a LARGER X (moving left to right).
let pA = simplified[bestIdx];
let pB = simplified[(bestIdx + 1) % simplified.length];

if (pB.x < pA.x) {
  // It's going right-to-left, reverse it!
  simplified.reverse();
  bestIdx = simplified.length - 1 - bestIdx;
}

// Rotate array to start at bestIdx
const ordered = [...simplified.slice(bestIdx), ...simplified.slice(0, bestIdx)];

let finalPath = '';
for(let i = 0; i < ordered.length; i++) {
  finalPath += (i === 0 ? 'M ' : 'L ') + ordered[i].x + ' ' + ordered[i].y + ' ';
}
finalPath += 'Z';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.match(/viewBox="([^"]+)"/)[1]}">
  <path d="${finalPath}" />
</svg>`;

fs.writeFileSync('src/assets/tracks/mexico.svg', svg);
console.log('Start point:', ordered[0], 'Next point:', ordered[1]);
console.log('Re-ordered and saved.');
