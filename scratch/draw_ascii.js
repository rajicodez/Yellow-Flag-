const path = `M 770 225
L 800 230
C 820 233, 835 225, 840 230
C 860 250, 870 290, 830 300
C 790 310, 770 270, 730 285
C 700 295, 680 255, 640 265
C 620 270, 615 250, 580 245
L 450 225
C 430 220, 425 205, 410 210
C 395 215, 390 225, 360 215
L 180 180
C 140 170, 70 160, 70 135
C 70 110, 120 115, 150 120
L 700 200
C 720 203, 730 195, 740 210
C 750 225, 755 220, 770 225
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

const grid = Array.from({length: 40}, () => Array(80).fill(' '));
for (const p of pts) {
  const x = Math.floor(p.x / 12);
  const y = Math.floor(p.y / 12);
  if (y >= 0 && y < 40 && x >= 0 && x < 80) grid[y][x] = '*';
}
console.log(grid.map(r => r.join('')).join('\n'));
