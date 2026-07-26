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

const r = fs.readFileSync('src/assets/tracks/mexico.svg', 'utf8');
const d = r.match(/d="([^"]+)"/)[1];
const rawPts = samplePathD(d);

function lineIntersect(p1, p2, p3, p4) {
    let denom = (p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y);
    if (denom == 0) return null; // Parallel or collinear
    let ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
    let ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        return {
            x: p1.x + ua * (p2.x - p1.x),
            y: p1.y + ua * (p2.y - p1.y)
        };
    }
    return null;
}

const n = rawPts.length;
for (let i = 0; i < n; i++) {
  for (let j = i + 2; j < n; j++) {
    if (i === 0 && j >= n - 2) continue; // loop closure wrap
    const a1 = rawPts[i], a2 = rawPts[(i+1)%n];
    const b1 = rawPts[j], b2 = rawPts[(j+1)%n];
    const ix = lineIntersect(a1, a2, b1, b2);
    if (ix) {
      console.log('Intersection found between segment', i, 'and', j);
      console.log('Intersection pos:', ix);
      console.log('Seg A:', a1, a2);
      console.log('Seg B:', b1, b2);
    }
  }
}
console.log('Done checking raw sampled polyline (length ' + n + ').');
