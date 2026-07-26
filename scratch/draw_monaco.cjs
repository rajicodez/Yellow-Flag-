const fs = require('fs');

const path = `M 200 300 L 300 200 C 320 180, 340 190, 360 180 L 450 140 C 470 130, 470 110, 490 110 C 510 110, 510 130, 530 150 L 570 190 C 590 210, 570 230, 550 220 C 510 200, 500 240, 530 250 C 550 260, 570 280, 590 270 C 650 250, 750 200, 850 200 C 900 200, 950 250, 900 300 C 880 320, 850 320, 800 320 C 780 320, 780 340, 760 340 C 740 340, 740 320, 720 320 C 700 320, 700 340, 680 340 L 650 340 C 620 340, 610 370, 580 370 C 550 370, 550 340, 520 340 C 490 340, 490 370, 460 370 L 300 370 C 250 370, 230 420, 200 380 C 180 350, 180 320, 200 300 Z`;

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
const lines = path.replace(/([A-Z])/g, '\n$1').split('\n').map(l => l.trim()).filter(Boolean);
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

const grid = Array.from({length: 40}, () => Array(80).fill(' '));
for (const p of pts) {
  const x = Math.floor(p.x / 12.5);
  const y = Math.floor(p.y / 12.5);
  if (y >= 0 && y < 40 && x >= 0 && x < 80) grid[y][x] = '*';
}
console.log(grid.map(r => r.join('')).join('\n'));
