import fs from 'fs';

// Replicate samplePathD and other logic from racerTracks.js
function tokenizePath(d) {
  return d.match(/[a-df-zA-DF-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
}

function sampleLine(out, ax, ay, bx, by) {
  const steps = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 12));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t });
  }
}

function samplePathD(d) {
  const tokens = tokenizePath(d);
  const out = [];
  let i = 0;
  let cmd = '';
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const num = () => Number.parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();

    switch (cmd.toUpperCase()) {
      case 'M': {
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        cx = x; cy = y; sx = x; sy = y;
        out.push({ x, y });
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        sampleLine(out, cx, cy, x, y);
        cx = x; cy = y;
        break;
      }
      case 'Z': {
        if (Math.hypot(sx - cx, sy - cy) > 0.5) sampleLine(out, cx, cy, sx, sy);
        cx = sx; cy = sy;
        break;
      }
    }
  }
  return out;
}

function resampleClosed(raw, n) {
  const pts = raw.filter(
    (p, idx) => idx === 0 || Math.hypot(p.x - raw[idx - 1].x, p.y - raw[idx - 1].y) > 0.01
  );
  const m = pts.length;
  const lengths = [];
  let total = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % m];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(len);
    total += len;
  }
  const step = total / n;
  const out = [];
  let seg = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (acc + lengths[seg] < target) {
      acc += lengths[seg];
      seg = (seg + 1) % m;
    }
    const a = pts[seg];
    const b = pts[(seg + 1) % m];
    const t = lengths[seg] > 0 ? (target - acc) / lengths[seg] : 0;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const d = r.match(/d="([^"]+)"/)[1];
const rawPts = resampleClosed(samplePathD(d), 240);

function ccw(A, B, C) {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function intersect(p1, p2, p3, p4) {
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

let ix = 0;
const n = rawPts.length;
for (let i = 0; i < n; i++) {
  for (let j = i + 2; j < n; j++) {
    if (i === 0 && j >= n - 2) continue; // wrap around
    const a1 = rawPts[i], a2 = rawPts[(i+1)%n];
    const b1 = rawPts[j], b2 = rawPts[(j+1)%n];
    if (intersect(a1, a2, b1, b2)) {
      console.log('Intersection between seg', i, 'and', j);
      ix++;
    }
  }
}
console.log('Total intersections in resampled (SAMPLES=240):', ix);

// Check before resampling as well
const prePts = samplePathD(d);
const pn = prePts.length;
let pix = 0;
for (let i = 0; i < pn; i++) {
  for (let j = i + 2; j < pn; j++) {
    if (i === 0 && j >= pn - 2) continue; // wrap around
    const a1 = prePts[i], a2 = prePts[(i+1)%pn];
    const b1 = prePts[j], b2 = prePts[(j+1)%pn];
    if (intersect(a1, a2, b1, b2)) {
      console.log('Intersection before resampling:', i, 'and', j);
      pix++;
    }
  }
}
console.log('Total intersections before resampling:', pix);

