// F1 Racer championship calendar built from the real SVG circuit layouts in
// src/assets/tracks/. The exact <path d="..."> data of each file is parsed,
// sampled into a dense centerline, scaled/centered onto the 960x600 canvas,
// and also exposed as a Canvas Path2D for rendering + collision detection.
//
// Derived per track:
//   pts          uniformly spaced centerline points (progress + walls)
//   racingLine   apex-seeking AI line (centerline pulled to the inside of corners)
//   speedFactor  per-point corner speed multiplier from local curvature
//   path2d       the authentic SVG shape, transformed into canvas space

export const CANVAS_W = 960;
export const CANVAS_H = 600;

const SAMPLES = 240;
const APEX_GAIN = 16;
const SLOW_GAIN = 0.5;
const MIN_SPEED_FACTOR = 0.55;

// ── Albert Park (Australia) manual racing-line waypoints ────────────────────
// Defined in SVG path-space (viewBox 0 0 800 600). getTrackGeometry() applies
// the same fitTransform used for pts/racingLine, so the points snap exactly
// onto the rendered tarmac regardless of canvas DPI or margin changes.
// 48 points tracing the 2022-present 14-turn layout (clockwise, pit-straight
// is index 0, same winding as the SVG path).
const AUSTRALIA_WAYPOINTS_SVG = [
  // ── Pit straight (east / left→right at top of canvas) ──────────────────
  { x: 390, y: 95 },  { x: 450, y: 90 },  { x: 510, y: 92 },
  // ── T1 (sharp right-hander) ─────────────────────────────────────────────
  { x: 548, y: 104 }, { x: 548, y: 132 },
  // ── T2 (left) ───────────────────────────────────────────────────────────
  { x: 520, y: 158 }, { x: 495, y: 174 },
  // ── T3-T4 (right-left complex) ──────────────────────────────────────────
  { x: 452, y: 192 }, { x: 448, y: 220 }, { x: 462, y: 246 },
  // ── T5-T6 high-speed kink (chicane removed 2022) ────────────────────────
  { x: 490, y: 256 }, { x: 538, y: 244 }, { x: 570, y: 226 },
  // ── T7 (right-hander) ───────────────────────────────────────────────────
  { x: 606, y: 218 }, { x: 628, y: 236 }, { x: 626, y: 268 },
  // ── T8 right hairpin (slowest corner) ───────────────────────────────────
  { x: 614, y: 290 }, { x: 598, y: 338 },
  // ── Back straight (heading south-east) ──────────────────────────────────
  { x: 602, y: 368 }, { x: 608, y: 402 },
  // ── T9 (right) ──────────────────────────────────────────────────────────
  { x: 594, y: 432 }, { x: 568, y: 450 },
  // ── T10 (right, lake section) ───────────────────────────────────────────
  { x: 508, y: 452 }, { x: 484, y: 432 },
  // ── T11 (left) ──────────────────────────────────────────────────────────
  { x: 432, y: 442 }, { x: 412, y: 460 },
  // ── T12 hairpin ─────────────────────────────────────────────────────────
  { x: 393, y: 500 }, { x: 388, y: 528 }, { x: 372, y: 556 },
  // ── T13 (left exit) ─────────────────────────────────────────────────────
  { x: 348, y: 562 }, { x: 318, y: 532 },
  // ── West loop approach ──────────────────────────────────────────────────
  { x: 316, y: 504 }, { x: 286, y: 460 }, { x: 258, y: 456 },
  // ── T14 (left-hander) ───────────────────────────────────────────────────
  { x: 220, y: 412 }, { x: 218, y: 378 }, { x: 242, y: 348 },
  // ── Inner northwest section ──────────────────────────────────────────────
  { x: 262, y: 332 }, { x: 282, y: 320 },
  { x: 292, y: 278 }, { x: 280, y: 254 },
  // ── North approach ──────────────────────────────────────────────────────
  { x: 238, y: 218 }, { x: 213, y: 215 }, { x: 180, y: 182 },
  // ── North hairpin ────────────────────────────────────────────────────────
  { x: 176, y: 158 }, { x: 202, y: 114 }, { x: 228, y: 108 },
  // ── Pit straight entry ───────────────────────────────────────────────────
  { x: 280, y: 118 }, { x: 348, y: 102 }, { x: 380, y: 92 },
];

const svgSources = import.meta.glob('../assets/tracks/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function getSvgSource(id) {
  const entry = Object.entries(svgSources).find(([path]) => path.endsWith(`/${id}.svg`));
  if (!entry) throw new Error(`Missing track SVG: ${id}.svg`);
  return entry[1];
}

// The first <path> in each file is the circuit outline; later paths/shapes
// are decorative (DRS lines, lakes, etc.).
function extractPathD(svgText) {
  const match = svgText.match(/<(?:[a-zA-Z0-9_-]+:)?path[^>]*\sd="([^"]+)"/);
  if (!match) throw new Error('No <path d="..."> found in track SVG');
  return match[1];
}

/* ----------------------------- Path sampling ----------------------------- */

function tokenizePath(d) {
  return d.match(/[a-df-zA-DF-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
}

function sampleCubic(out, p0x, p0y, c1x, c1y, c2x, c2y, p1x, p1y) {
  const est =
    Math.hypot(c1x - p0x, c1y - p0y) +
    Math.hypot(c2x - c1x, c2y - c1y) +
    Math.hypot(p1x - c2x, p1y - c2y);
  const steps = Math.max(8, Math.round(est / 8));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p1x,
      y: u * u * u * p0y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p1y,
    });
  }
}

function sampleLine(out, ax, ay, bx, by) {
  const steps = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 12));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t });
  }
}

// Converts SVG path data (M/L/H/V/C/S/Z, absolute or relative) into a dense
// polyline. Enough for the layout SVGs; throws loudly on unsupported commands.
function samplePathD(d) {
  const tokens = tokenizePath(d);
  const out = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let pcx = null;
  let pcy = null;
  const num = () => Number.parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    let cubic = null;

    switch (cmd.toUpperCase()) {
      case 'M': {
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        cx = x;
        cy = y;
        sx = x;
        sy = y;
        out.push({ x, y });
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        sampleLine(out, cx, cy, x, y);
        cx = x;
        cy = y;
        break;
      }
      case 'H': {
        const x = num() + (rel ? cx : 0);
        sampleLine(out, cx, cy, x, cy);
        cx = x;
        break;
      }
      case 'V': {
        const y = num() + (rel ? cy : 0);
        sampleLine(out, cx, cy, cx, y);
        cy = y;
        break;
      }
      case 'C': {
        const c1x = num() + (rel ? cx : 0);
        const c1y = num() + (rel ? cy : 0);
        const c2x = num() + (rel ? cx : 0);
        const c2y = num() + (rel ? cy : 0);
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        cubic = [c1x, c1y, c2x, c2y, x, y];
        break;
      }
      case 'S': {
        const c1x = pcx !== null ? 2 * cx - pcx : cx;
        const c1y = pcy !== null ? 2 * cy - pcy : cy;
        const c2x = num() + (rel ? cx : 0);
        const c2y = num() + (rel ? cy : 0);
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        cubic = [c1x, c1y, c2x, c2y, x, y];
        break;
      }
      case 'Z': {
        if (Math.hypot(sx - cx, sy - cy) > 0.5) sampleLine(out, cx, cy, sx, sy);
        cx = sx;
        cy = sy;
        break;
      }
      default:
        throw new Error(`Unsupported SVG path command: ${cmd}`);
    }

    if (cubic) {
      sampleCubic(out, cx, cy, ...cubic);
      pcx = cubic[2];
      pcy = cubic[3];
      cx = cubic[4];
      cy = cubic[5];
    } else if (cmd.toUpperCase() !== 'S') {
      pcx = null;
      pcy = null;
    }
  }
  return out;
}

// Uniform arc-length resampling of a closed polyline to exactly n points, so
// segment indices map linearly to race progress.
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
  let seg = 0;
  let acc = 0;
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

/* ------------------------- Fitting + racing data ------------------------- */

function fitTransform(pts, margin) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const scale = Math.min(
    (CANVAS_W - margin * 2) / (maxX - minX),
    (CANVAS_H - margin * 2) / (maxY - minY)
  );
  const tx = (CANVAS_W - (maxX - minX) * scale) / 2 - minX * scale;
  const ty = (CANVAS_H - (maxY - minY) * scale) / 2 - minY * scale;
  return { scale, tx, ty };
}

const smoothClosed = (arr, passes) => {
  let cur = arr;
  for (let p = 0; p < passes; p++) {
    cur = cur.map((v, i) => {
      const prev = cur[(i - 1 + cur.length) % cur.length];
      const next = cur[(i + 1) % cur.length];
      return typeof v === 'number'
        ? (prev + v * 2 + next) / 4
        : { x: (prev.x + v.x * 2 + next.x) / 4, y: (prev.y + v.y * 2 + next.y) / 4 };
    });
  }
  return cur;
};

// Signed turn angle over a +-k point window, then an apex line: each point is
// pulled toward the concave (inside) edge of the corner in proportion to the
// local curvature, clamped to stay well within the tarmac.
function buildRacingData(pts, width) {
  const n = pts.length;
  const k = 3;
  const maxOff = width / 2 - 12;

  let curv = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - k + n) % n];
    const b = pts[i];
    const c = pts[(i + k) % n];
    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    curv[i] = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y);
  }
  curv = smoothClosed(curv, 2);

  let racingLine = pts.map((b, i) => {
    const a = pts[(i - k + n) % n];
    const c = pts[(i + k) % n];
    const dx = a.x + c.x - 2 * b.x;
    const dy = a.y + c.y - 2 * b.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return { x: b.x, y: b.y };
    const mag = Math.min(maxOff, Math.abs(curv[i]) * APEX_GAIN);
    return { x: b.x + (dx / len) * mag, y: b.y + (dy / len) * mag };
  });
  racingLine = smoothClosed(racingLine, 2);

  const speedFactor = curv.map((c) =>
    Math.max(MIN_SPEED_FACTOR, Math.min(1, 1 - Math.abs(c) * SLOW_GAIN))
  );

  return { racingLine, speedFactor };
}

/* -------------------------------- Calendar ------------------------------- */

const CALENDAR = [
  { id: 'australia', name: 'Australia', circuit: 'Albert Park' },
  { id: 'china', name: 'China', circuit: 'Shanghai' },
  { id: 'suzuka', name: 'Japan', circuit: 'Suzuka Circuit' },
  { id: 'bahrain', name: 'Bahrain', circuit: 'Bahrain International Circuit' },
  { id: 'saudi-arabia', name: 'Saudi Arabia', circuit: 'Jeddah Corniche Circuit' },
  { id: 'miami', name: 'Miami', circuit: 'Miami International Autodrome' },
  { id: 'imola', name: 'Emilia Romagna', circuit: 'Imola' },
  { id: 'monaco', name: 'Monaco', circuit: 'Monte Carlo' },
  { id: 'spain', name: 'Spain', circuit: 'IFEMA Madrid' },
  { id: 'canada', name: 'Canada', circuit: 'Circuit Gilles Villeneuve' },
  { id: 'austria', name: 'Austria', circuit: 'Red Bull Ring' },
  { id: 'silverstone', name: 'Great Britain', circuit: 'Silverstone' },
  { id: 'belgium', name: 'Belgium', circuit: 'Spa-Francorchamps' },
  { id: 'hungary', name: 'Hungary', circuit: 'Hungaroring' },
  { id: 'zandvoort', name: 'Netherlands', circuit: 'Circuit Zandvoort' },
  { id: 'monza', name: 'Italy', circuit: 'Autodromo Nazionale Monza' },
  { id: 'baku', name: 'Azerbaijan', circuit: 'Baku City Circuit' },
  { id: 'singapore', name: 'Singapore', circuit: 'Marina Bay' },
  { id: 'cota', name: 'United States', circuit: 'Circuit of the Americas' },
  { id: 'austin', name: 'United States', circuit: 'Circuit of The Americas' },
  { id: 'mexico', name: 'Mexico', circuit: 'Autodromo Hermanos Rodriguez' },
  { id: 'brazil', name: 'Brazil', circuit: 'Interlagos' },
  { id: 'las-vegas', name: 'Las Vegas', circuit: 'Las Vegas Strip Circuit' },
  { id: 'qatar', name: 'Qatar', circuit: 'Lusail' },
  { id: 'abu-dhabi', name: 'Abu Dhabi', circuit: 'Yas Marina' }
];

const TRACK_WIDTHS = {
  monaco: 52,
  singapore: 52,
  austria: 60,
  silverstone: 62,
  belgium: 64,
  hungary: 54,
  zandvoort: 56,
  monza: 58,
  baku: 54,
  cota: 60, // Fast flowing modern circuit
  mexico: 58,
};

const COLLISION_WIDTHS = {
  monaco: 72,
  singapore: 70, // Tight street circuit
  austria: 70,
  silverstone: 74,
  belgium: 76,
  hungary: 64,
  zandvoort: 66,
  monza: 68,
  baku: 66,
  cota: 72, // Generous runoff
  mexico: 70,
};

const VISUAL_ROAD_WIDTHS = {
  monaco: 52,
  singapore: 52,
  austria: 60,
  silverstone: 62,
  belgium: 64,
  hungary: 54,
  zandvoort: 56,
  monza: 58,
  baku: 54,
  cota: 60,
  mexico: 58,
};

const BORDER_WIDTHS = {
  monaco: 62,
  singapore: 62,
  austria: 70,
  silverstone: 72,
  belgium: 74,
  hungary: 64,
  zandvoort: 66,
  monza: 68,
  baku: 64,
  cota: 70,
  mexico: 68,
};

const KERB_WIDTHS = {
  monaco: 62,
  singapore: 62,
  austria: 70,
  silverstone: 72,
  belgium: 74,
  hungary: 64,
  zandvoort: 66,
  monza: 68,
  baku: 64,
  cota: 70,
  mexico: 68,
};

// Pure-math geometry (no DOM APIs), computed once per track at module load.
const baseCache = new Map();

function getBaseGeometry(id, width) {
  if (baseCache.has(id)) return baseCache.get(id);
  const d = extractPathD(getSvgSource(id));
  const rawPts = resampleClosed(samplePathD(d), SAMPLES);
  const { scale, tx, ty } = fitTransform(rawPts, width / 2 + 30);
  const pts = rawPts.map((p) => ({ x: p.x * scale + tx, y: p.y * scale + ty }));
  const base = { d, pts, n: pts.length, transform: { scale, tx, ty }, ...buildRacingData(pts, width) };
  baseCache.set(id, base);
  return base;
}

function perimeterOf(pts) {
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

export const TRACKS = CALENDAR.map((entry, index) => {
  const width = TRACK_WIDTHS[entry.id] ?? 56;
  const collisionWidth = COLLISION_WIDTHS[entry.id] ?? width;
  const visualRoadWidth = VISUAL_ROAD_WIDTHS[entry.id] ?? width;
  const borderWidth = BORDER_WIDTHS[entry.id] ?? (width + 10);
  const kerbWidth = KERB_WIDTHS[entry.id] ?? (width + 10);
  const perimeter = perimeterOf(getBaseGeometry(entry.id, width).pts);
  return {
    ...entry,
    round: index + 1,
    laps: perimeter > 2000 ? 3 : perimeter > 1600 ? 4 : 5,
    width,
    collisionWidth,
    visualRoadWidth,
    borderWidth,
    kerbWidth,
  };
});

/* -------------------------------- Geometry ------------------------------- */

const path2dCache = new Map();

export function getTrackGeometry(track) {
  const base = getBaseGeometry(track.id, track.width);
  // Path2D/DOMMatrix are browser APIs, so the drivable-surface path is built
  // lazily: the raw SVG path data transformed into canvas space.
  if (!path2dCache.has(track.id)) {
    const { scale, tx, ty } = base.transform;
    const path = new Path2D();
    path.addPath(new Path2D(base.d), new DOMMatrix([scale, 0, 0, scale, tx, ty]));
    path2dCache.set(track.id, path);
  }

  // For Australia, expose the hand-placed racing-line waypoints in canvas
  // space. The same scale/tx/ty as pts ensures they align with the tarmac.
  let waypoints = null;
  if (track.id === 'australia') {
    const { scale, tx, ty } = base.transform;
    waypoints = AUSTRALIA_WAYPOINTS_SVG.map(({ x, y }) => ({
      x: x * scale + tx,
      y: y * scale + ty,
    }));
  }

  return { ...base, path2d: path2dCache.get(track.id), waypoints };
}
