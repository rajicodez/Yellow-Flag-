import fs from 'fs';

const d = fs.readFileSync('mexico.svg', 'utf8');
const pathD = d.match(/d="([^"]+)"/)[1];
const pts = pathD.match(/[0-9.]+/g).map(Number);
let minX = 1000, maxX = 0, minY = 1000, maxY = 0;
for(let i=0; i<pts.length; i+=2) {
  minX = Math.min(minX, pts[i]);
  maxX = Math.max(maxX, pts[i]);
  minY = Math.min(minY, pts[i+1]);
  maxY = Math.max(maxY, pts[i+1]);
}
console.log({minX, maxX, minY, maxY, w: maxX-minX, h: maxY-minY});
