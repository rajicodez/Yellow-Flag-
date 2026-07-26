import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);
for (let i = 180 * 2; i <= 210 * 2; i += 2) {
  if (i < pts.length) {
    console.log(`Idx ${i/2} : ${pts[i]}, ${pts[i+1]}`);
  }
}
