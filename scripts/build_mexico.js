import fs from 'fs';

const p_safe = [
  {x: 40, y: -20},   // T4
  {x: 100, y: -60},  // T5
  {x: 20, y: -160},  // T6 entry
  {x: 100, y: -240}, // T6 hairpin
  {x: 180, y: -180}, // T6 exit
  {x: 100, y: -100}, // T7
  {x: 180, y: -80},  // T8
  {x: 120, y: -40},  // T9
  {x: 180, y: -20},  // T10
  {x: 140, y: -5},   // T11
  {x: 160, y: -5},   // Curve
];

const svgStr = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const replaced = svgStr.replace(/L 120\.00 10\.00(.*)Z/, 'L 120.00 10.00 ' + p_safe.map(pt => `L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `).join('') + 'Z');
fs.writeFileSync('src/assets/tracks/mexico_fixed.svg', replaced);
console.log("Wrote mexico_fixed.svg");
