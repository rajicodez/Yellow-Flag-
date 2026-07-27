import fs from 'fs';

function tokenizePath(d) { return d.match(/[a-df-zA-DF-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? []; }
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
  let i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0;
  const num = () => Number.parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': {
        const x = num() + (rel ? cx : 0); const y = num() + (rel ? cy : 0);
        cx = x; cy = y; sx = x; sy = y; out.push({ x, y }); cmd = rel ? 'l' : 'L'; break;
      }
      case 'L': {
        const x = num() + (rel ? cx : 0); const y = num() + (rel ? cy : 0);
        sampleLine(out, cx, cy, x, y); cx = x; cy = y; break;
      }
      case 'Z': {
        if (Math.hypot(sx - cx, sy - cy) > 0.5) sampleLine(out, cx, cy, sx, sy);
        cx = sx; cy = sy; break;
      }
    }
  }
  return out;
}

function resampleClosed(raw, n) {
  const pts = raw.filter((p, idx) => idx === 0 || Math.hypot(p.x - raw[idx - 1].x, p.y - raw[idx - 1].y) > 0.01);
  const m = pts.length;
  const lengths = [];
  let total = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % m];
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
    const a = pts[seg], b = pts[(seg + 1) % m];
    const t = lengths[seg] > 0 ? (target - acc) / lengths[seg] : 0;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const d = r.match(/d="([^"]+)"/)[1];
const rawPts = resampleClosed(samplePathD(d), 240);

function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t; const qy = ay + dy * t;
  return Math.hypot(px - qx, py - qy);
}

function distSegmentToSegment(a1, a2, b1, b2) {
  return Math.min(
    distPointToSegment(a1.x, a1.y, b1.x, b1.y, b2.x, b2.y),
    distPointToSegment(a2.x, a2.y, b1.x, b1.y, b2.x, b2.y),
    distPointToSegment(b1.x, b1.y, a1.x, a1.y, a2.x, a2.y),
    distPointToSegment(b2.x, b2.y, a1.x, a1.y, a2.x, a2.y)
  );
}

const n = rawPts.length;
let minD = Infinity;
let minPair = null;

for (let i = 0; i < n; i++) {
  for (let j = i + 10; j < n; j++) {
    if (i === 0 && j >= n - 10) continue;
    const a1 = rawPts[i], a2 = rawPts[(i+1)%n];
    const b1 = rawPts[j], b2 = rawPts[(j+1)%n];
    const d = distSegmentToSegment(a1, a2, b1, b2);
    if (d < minD) {
      minD = d;
      minPair = [i, j, a1, a2, b1, b2];
    }
  }
}
console.log('Minimum distance between non-adjacent segments:', minD);
if (minPair) {
  console.log('Between seg', minPair[0], 'and', minPair[1]);
  console.log('p1:', minPair[2], 'p2:', minPair[4]);
}
