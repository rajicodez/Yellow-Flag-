const fs = require('fs');

const path = `M 450 480
L 350 480
C 300 480, 200 480, 150 430
C 100 380, 150 330, 200 330
C 250 330, 300 380, 350 330
C 400 280, 450 280, 500 230
C 550 180, 600 180, 650 230
L 700 280
C 750 330, 800 330, 850 280
C 900 230, 850 180, 800 180
C 750 180, 700 180, 650 130
C 600 80, 650 30, 700 30
C 750 30, 800 80, 850 80
L 900 80
C 950 80, 1000 130, 1000 180
C 1000 230, 950 280, 900 280
L 800 280
L 700 280
L 600 280
C 550 280, 500 330, 450 380
C 400 430, 450 480, 500 480
Z`;

function sampleCubic(p0, c1, c2, p1, steps=20) {
  const pts = [];
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const u = 1 - t;
    pts.push({
      x: u*u*u*p0.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*p1.x,
      y: u*u*u*p0.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*p1.y,
    });
  }
  return pts;
}

const pts = [];
const lines = path.split('\n').map(l => l.trim()).filter(Boolean);
let cx = 0, cy = 0;
for (const line of lines) {
  const parts = line.replace(/,/g, '').split(' ');
  const cmd = parts[0];
  if (cmd === 'M') {
    cx = +parts[1]; cy = +parts[2];
    pts.push({x: cx, y: cy});
  } else if (cmd === 'L') {
    const nx = +parts[1], ny = +parts[2];
    const steps = 10;
    for(let i=1; i<=steps; i++) pts.push({x: cx + (nx-cx)*i/steps, y: cy + (ny-cy)*i/steps});
    cx = nx; cy = ny;
  } else if (cmd === 'C') {
    const c1 = {x: +parts[1], y: +parts[2]};
    const c2 = {x: +parts[3], y: +parts[4]};
    const p1 = {x: +parts[5], y: +parts[6]};
    pts.push(...sampleCubic({x: cx, y: cy}, c1, c2, p1));
    cx = p1.x; cy = p1.y;
  }
}

const grid = Array.from({length: 50}, () => Array(100).fill(' '));
for (const p of pts) {
  const x = Math.floor(p.x / 12);
  const y = Math.floor(p.y / 12);
  if (y >= 0 && y < 50 && x >= 0 && x < 100) grid[y][x] = '*';
}
console.log(grid.map(r => r.join('')).join('\n'));
