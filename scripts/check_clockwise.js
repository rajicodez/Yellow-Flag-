import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const m = r.match(/d="([^"]+)"/)[1];
const pts = m.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g).map(Number);

let area = 0;
for(let i=0; i<pts.length; i+=2){
  const p1x = pts[i], p1y = pts[i+1];
  const p2x = pts[(i+2)%pts.length], p2y = pts[(i+3)%pts.length];
  area += (p2x - p1x) * (p2y + p1y);
}
console.log('Area:', area, area > 0 ? 'Clockwise' : 'Counter-Clockwise');

// If counter-clockwise, rewrite it clockwise
if (area < 0) {
  const loop = [];
  for (let i = 0; i < pts.length; i+=2) {
    loop.push({x: pts[i], y: pts[i+1]});
  }
  loop.reverse();
  
  let svgPath = '';
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i];
    if (i === 0) svgPath += `M ${p.x} ${p.y} `;
    else svgPath += `L ${p.x} ${p.y} `;
  }
  svgPath += 'Z';
  
  const svgOut = r.replace(/d="[^"]+"/, `d="${svgPath}"`);
  fs.writeFileSync('src/assets/tracks/monaco.svg', svgOut);
  console.log('Reversed and saved src/assets/tracks/monaco.svg');
}
