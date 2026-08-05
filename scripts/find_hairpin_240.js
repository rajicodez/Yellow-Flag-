import fs from 'fs';

const r = fs.readFileSync('src/data/racerTracks.js', 'utf8');

// I will just copy the sample function logic
const svg = fs.readFileSync('src/assets/tracks/monaco.svg', 'utf8');
const d = svg.match(/d="([^"]+)"/)[1];

function tokenizePath(d) {
  return d.match(/[a-df-zA-DF-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
}

function sampleLine(out, ax, ay, bx, by) {
  const est = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(2, Math.round(est / 8));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t });
  }
}

function samplePathD(d) {
  const tokens = tokenizePath(d);
  let i = 0;
  const out = [];
  let currX = 0, currY = 0;
  let startX = 0, startY = 0;
  
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      currX = parseFloat(tokens[i++]);
      currY = parseFloat(tokens[i++]);
      startX = currX;
      startY = currY;
      out.push({ x: currX, y: currY });
    } else if (cmd === 'L') {
      const nx = parseFloat(tokens[i++]);
      const ny = parseFloat(tokens[i++]);
      sampleLine(out, currX, currY, nx, ny);
      currX = nx;
      currY = ny;
    } else if (cmd === 'Z') {
      sampleLine(out, currX, currY, startX, startY);
    }
  }
  return out;
}

function resampleClosed(pts, count) {
  let total = 0;
  const dists = [0];
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    total += d;
    dists.push(total);
  }
  
  const res = [];
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    let idx = 0;
    while (idx < dists.length - 1 && dists[idx + 1] < target) {
      idx++;
    }
    const p1 = pts[idx];
    const p2 = pts[(idx + 1) % pts.length];
    const segmentLen = dists[idx + 1] - dists[idx];
    const t = segmentLen === 0 ? 0 : (target - dists[idx]) / segmentLen;
    res.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    });
  }
  return res;
}

const sampled = resampleClosed(samplePathD(d), 240);
let maxX = 0; let maxIdx = 0;
for (let i = 0; i < sampled.length; i++) {
  if (sampled[i].x > maxX) {
    maxX = sampled[i].x;
    maxIdx = i;
  }
}

console.log('Hairpin in 240 array:', maxIdx);
