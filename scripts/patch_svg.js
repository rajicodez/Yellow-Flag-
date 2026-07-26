import fs from 'fs';

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const d = fs.readFileSync('scripts/fixed_mexico_d.txt', 'utf8');
const fixedSVG = r.replace(/d="([^"]+)"/, `d="${d}"`);
fs.writeFileSync('src/assets/tracks/mexico.svg', fixedSVG);
console.log('Fixed SVG written to src/assets/tracks/mexico.svg');
