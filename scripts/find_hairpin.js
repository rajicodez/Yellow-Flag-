import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);
let maxX=0; let maxIdx=0; 
for(let i=0;i<pts.length;i+=2){
  if(pts[i]>maxX){
    maxX=pts[i]; 
    maxIdx=i/2;
  }
} 
console.log('SVG Hairpin index:', maxIdx, 'out of', pts.length/2);
