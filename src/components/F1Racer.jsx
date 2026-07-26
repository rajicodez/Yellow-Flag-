import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Flag, Lock, RotateCcw, Trophy } from 'lucide-react';
import abuDhabi from '../assets/tracks/abu-dhabi.svg';
import australia from '../assets/tracks/australia.svg';
import china from '../assets/tracks/china.svg';
import canada from '../assets/tracks/canada.svg';
import suzuka from '../assets/tracks/suzuka.svg';
import monaco from '../assets/tracks/monaco.svg';
import monza from '../assets/tracks/monza.svg';
import silverstone from '../assets/tracks/silverstone.svg';
import singapore from '../assets/tracks/singapore.svg';
import mexico from '../assets/tracks/mexico.svg';
import brazil from '../assets/tracks/brazil.svg';
import lasVegas from '../assets/tracks/las-vegas.svg';
import lusail from '../assets/tracks/lusail.svg';
import { TRACKS, getTrackGeometry } from '../data/racerTracks';

const CANVAS_W = 960;
const CANVAS_H = 600;

const TRACK_SVGS = {
  'abu-dhabi': abuDhabi,
  australia,
  canada,
  china,
  suzuka,
  monaco,
  monza,
  silverstone,
  singapore,
  mexico,
  brazil,
  'las-vegas': lasVegas,
  lusail,
};
const UNLOCKED_KEY = 'yf-racer-unlocked';
const RESULTS_KEY = 'yf-racer-results';
const TOTAL_ROUNDS = TRACKS.length;

// Points for P1-P5 (only five cars on the grid).
const POINTS_TABLE = [25, 18, 15, 12, 10];

const AI_SPECS = [
  { name: 'RENZO', color: '#ef4444', accent: '#7f1d1d' },
  { name: 'SILVA', color: '#d4d4d8', accent: '#3f3f46' },
  { name: 'BLEU', color: '#3b82f6', accent: '#1e3a8a' },
  { name: 'VIPER', color: '#22c55e', accent: '#14532d' },
];
const PLAYER_SPEC = { name: 'YOU', color: '#f97316', accent: '#7c2d12' };

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

const viewMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const normalizeAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

function nearestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  const qx = ax + dx * t;
  const qy = ay + dy * t;
  return { t, qx, qy, dist: Math.hypot(px - qx, py - qy) };
}

// Searches only a window of segments around the car's last known position, so
// overlapping sections (Suzuka's crossover) never confuse progress tracking.
function nearestSegment(pts, x, y, centerIdx, windowSize) {
  const n = pts.length;
  let best = null;
  for (let k = centerIdx - windowSize; k <= centerIdx + windowSize; k++) {
    const i = ((k % n) + n) % n;
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const r = nearestOnSegment(x, y, a.x, a.y, b.x, b.y);
    if (!best || r.dist < best.dist) best = { ...r, idx: i };
  }
  return best;
}

// Finds the shortest perpendicular distance from point (px,py) to the closed
// polyline defined by `wps`. Used for the Albert Park off-track penalty.
function nearestDistToPolyline(px, py, wps) {
  let minDist = Infinity;
  const n = wps.length;
  for (let i = 0; i < n; i++) {
    const a = wps[i];
    const b = wps[(i + 1) % n];
    const d = nearestOnSegment(px, py, a.x, a.y, b.x, b.y).dist;
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Returns the index of the waypoint in `wps` closest to (x, y).
function nearestWpIdx(x, y, wps) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < wps.length; i++) {
    const d = Math.hypot(wps[i].x - x, wps[i].y - y);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

// The static track ribbon is rendered once to an offscreen canvas; the race
// loop only blits it, keeping per-frame work to car sprites alone. The ribbon
// is stroked directly from the authentic SVG Path2D, so the visible tarmac is
// the exact real-world circuit shape.
function buildTrackLayer(track, dpr) {
  const trackGeometry = getTrackGeometry(track);
  const { pts, path2d, crossoverZone } = trackGeometry;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0b0e11';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = 'rgba(250,204,21,0.02)';
  for (let gx = 0; gx < CANVAS_W; gx += 48) {
    for (let gy = 0; gy < CANVAS_H; gy += 48) {
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }

  const path = path2d;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = '#e4e4e7';
  ctx.lineWidth = track.borderWidth;
  ctx.stroke(path);
    ctx.setLineDash([16, 16]);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = track.kerbWidth;
    ctx.stroke(path);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#26272c';
    ctx.lineWidth = track.visualRoadWidth;
    ctx.stroke(path);
    ctx.setLineDash([12, 16]);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 2;
    ctx.stroke(path);
    ctx.setLineDash([]);

  // Chequered start/finish strip perpendicular to the racing direction.
  const p0 = pts[0];
  const p1 = pts[2];
  const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  const half = track.width / 2;
  const sq = 6;
  ctx.save();
  ctx.translate(p0.x, p0.y);
  ctx.rotate(angle);
  for (let col = 0; col < 2; col++) {
    for (let j = -half; j < half; j += sq) {
      const row = Math.floor((j + half) / sq);
      ctx.fillStyle = (col + row) % 2 === 0 ? '#fafafa' : '#18181b';
      ctx.fillRect(col * sq, j, sq, Math.min(sq, half - j));
    }
  }
  ctx.restore();

  // Draw Suzuka bridge mask and visual overpass
  if (crossoverZone) {
    const bridgePath = new Path2D();
    const [start, end] = crossoverZone.overpassSegmentRange;
    for (let k = start; k <= end; k++) {
      const p = pts[((k % pts.length) + pts.length) % pts.length];
      if (k === start) bridgePath.moveTo(p.x, p.y);
      else bridgePath.lineTo(p.x, p.y);
    }
    
    // Mask
    ctx.strokeStyle = '#0b0e11'; 
    ctx.lineWidth = track.borderWidth + 2;
    ctx.lineCap = 'butt';
    ctx.stroke(bridgePath);
    
    // Redraw bridge track
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = track.borderWidth;
    ctx.stroke(bridgePath);
    ctx.setLineDash([16, 16]);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = track.kerbWidth;
    ctx.stroke(bridgePath);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#26272c';
    ctx.lineWidth = track.visualRoadWidth;
    ctx.stroke(bridgePath);
    ctx.setLineDash([12, 16]);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 2;
    ctx.stroke(bridgePath);
    ctx.setLineDash([]);
  }

  return canvas;
}

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 14, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#101013';
  ctx.beginPath();
  ctx.roundRect(4.5, -8.4, 5, 3.6, 1.2);
  ctx.roundRect(4.5, 4.8, 5, 3.6, 1.2);
  ctx.roundRect(-9.5, -8.8, 5.6, 4, 1.2);
  ctx.roundRect(-9.5, 4.8, 5.6, 4, 1.2);
  ctx.fill();

  // Rear wing
  ctx.fillStyle = '#17171a';
  ctx.beginPath();
  ctx.roundRect(-12.5, -6.5, 3, 13, 1);
  ctx.fill();
  ctx.fillStyle = car.color;
  ctx.fillRect(-12.5, -1.6, 3, 3.2);

  // Main body + nose
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-10, -4.6, 11.5, 9.2, 2.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1, -3.4);
  ctx.lineTo(12.5, -1);
  ctx.lineTo(12.5, 1);
  ctx.lineTo(1, 3.4);
  ctx.closePath();
  ctx.fill();

  // Front wing
  ctx.beginPath();
  ctx.roundRect(11, -7, 3, 14, 1);
  ctx.fill();
  ctx.fillStyle = car.accent;
  ctx.fillRect(11, -7, 3, 2);
  ctx.fillRect(11, 5, 3, 2);

  // Cockpit + halo
  ctx.fillStyle = '#0a0a0c';
  ctx.beginPath();
  ctx.roundRect(-3.5, -2, 5.5, 4, 1.6);
  ctx.fill();
  ctx.strokeStyle = car.accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-0.5, 0, 2.6, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.restore();
}

/* ------------------------------ Persistence ------------------------------ */

function loadUnlocked() {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_KEY);
    const value = Number.parseInt(raw ?? '1', 10);
    return Number.isFinite(value) ? clamp(value, 1, TOTAL_ROUNDS + 1) : 1;
  } catch {
    return 1;
  }
}

function loadResults() {
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    const parsed = JSON.parse(raw ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/* ----------------------------- Race screen ----------------------------- */

function RaceScreen({ track, isLastTrack, onFinish, onRetry, onNextRace, onBackToSelect }) {
  const canvasRef = useRef(null);
  const carsRef = useRef([]);
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const raceStateRef = useRef('countdown');
  const finishCounterRef = useRef(0);
  const hudFrameRef = useRef(0);
  const callbacksRef = useRef({ onFinish });
  callbacksRef.current.onFinish = onFinish;

  const [raceState, setRaceState] = useState('countdown');
  const [lights, setLights] = useState(0);
  const [showGo, setShowGo] = useState(false);
  const [result, setResult] = useState(null);
  const [hud, setHud] = useState({ lap: 1, position: 5, speed: 0, board: [] });

  // Countdown: five red lights, then lights out.
  useEffect(() => {
    let count = 0;
    const interval = window.setInterval(() => {
      count += 1;
      setLights(count);
      if (count >= 5) window.clearInterval(interval);
    }, 620);
    const start = window.setTimeout(() => {
      raceStateRef.current = 'racing';
      setRaceState('racing');
      setLights(0);
      setShowGo(true);
      window.setTimeout(() => setShowGo(false), 1000);
    }, 620 * 5 + 900);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(start);
    };
  }, []);

  // Keyboard controls.
  useEffect(() => {
    const map = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
      W: 'up',
      S: 'down',
      A: 'left',
      D: 'right',
    };
    const onKeyDown = (e) => {
      const key = map[e.key];
      if (!key) return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
      keysRef.current[key] = true;
    };
    const onKeyUp = (e) => {
      const key = map[e.key];
      if (!key) return;
      keysRef.current[key] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Game engine: init cars, run simulation + render loop.
  useEffect(() => {
    const geometry = getTrackGeometry(track);
    const { pts, n, racingLine, speedFactor, path2d } = geometry;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = canvasRef.current;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const trackLayer = buildTrackLayer(track, dpr);

    // Untransformed 1x context used purely for hit-testing the authentic SVG
    // path: a point is on the tarmac iff it lies within the stroked ribbon.
    const collisionCtx = document.createElement('canvas').getContext('2d');
    collisionCtx.lineWidth = track.collisionWidth || track.width;
    collisionCtx.lineJoin = 'round';
    collisionCtx.lineCap = 'round';
    
    let isOnTrack = (x, y) => collisionCtx.isPointInStroke(path2d, x, y);

    // AI difficulty scales with championship progress. Pace is high enough to
    // punish any player mistake; the apex-hugging racing line means the AI
    // carries real speed through corners too.
    const skill = (track.round - 1) / (TOTAL_ROUNDS - 1);
    const aiTuning = (i) => ({
      maxSpeed: 4.2 + skill * 1.15 - i * 0.11,
      accel: 0.072,
      turnClamp: 0.098 + skill * 0.024,
      lineOffset: (i - 1.5) * 1.4 * (1 - skill * 0.7),
    });

    // Grid: AI in slots 1-4, player starts last (P5).
    const specs = [
      ...AI_SPECS.map((s, i) => ({ ...s, isPlayer: false, ...aiTuning(i) })),
      { ...PLAYER_SPEC, isPlayer: true },
    ];
    carsRef.current = specs.map((spec, i) => {
      const idx = (n - 4 - i * 3 + n) % n;
      const p = pts[idx];
      const q = pts[(idx + 1) % n];
      const heading = Math.atan2(q.y - p.y, q.x - p.x);
      const side = i % 2 === 0 ? -1 : 1;
      const lateral = side * track.width * 0.2;
      const startX = p.x + Math.cos(heading + Math.PI / 2) * lateral;
      const startY = p.y + Math.sin(heading + Math.PI / 2) * lateral;
      return {
        ...spec,
        x: startX,
        y: startY,
        heading,
        speed: 0,
        segIdx: idx,
        lastS: idx,
        totalProgress: idx - n,
        nextCheckpoint: 0,
        offTrack: false,
        finished: false,
        finishOrder: 0,
      };
    });

    const finishLine = track.laps * n;
    const maxOffset = track.width / 2 - 9;

    // Average centerline segment length, for progress-gap -> pixel conversion.
    let perimeter = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      perimeter += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const pxPerSeg = perimeter / n;
    // Smoothed global rubber-band multiplier applied to all AI cars.
    let aiBoost = 1;

    const sortStandings = () =>
      [...carsRef.current].sort((a, b) => {
        if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.totalProgress - a.totalProgress;
      });

    const endRace = (position) => {
      raceStateRef.current = 'finished';
      setRaceState('finished');
      setResult({
        position,
        victory: position <= 3,
        points: POINTS_TABLE[position - 1] ?? 0,
        standings: sortStandings().map((c) => ({
          name: c.name,
          color: c.color,
          isPlayer: c.isPlayer,
        })),
      });
      callbacksRef.current.onFinish(position);
    };

    const updateProgress = (car) => {
      // Restrict search window in Mexico to completely prevent jumping across esses
      const windowSize = track.id === 'mexico' ? 5 : 15;
      const near = nearestSegment(pts, car.x, car.y, car.segIdx, windowSize);
      // Boundary check — two modes depending on the track:
      //
      // Albert Park (waypoints defined): the player's distance from the
      // Player collision checks against the canonical centerline.
      const outside = !isOnTrack(car.x, car.y);

      if (outside || near.dist > maxOffset) {
        if (near.dist > maxOffset) {
          const nx = (car.x - near.qx) / (near.dist || 1);
          const ny = (car.y - near.qy) / (near.dist || 1);
          car.x = near.qx + nx * maxOffset;
          car.y = near.qy + ny * maxOffset;
        }
        if (!car.isPlayer) {
          car.speed *= 0.9;
        } else if (!car.offTrack) {
          car.offTrack = true;
          car.speed *= 0.55;   // ← 45% speed penalty on first frame off-track
        } else {
          car.speed *= 0.995;
        }
      } else {
        car.offTrack = false;
      }
      car.segIdx = near.idx;
      const s = near.idx + near.t;
      let delta = s - car.lastS;
      if (delta > n / 2) delta -= n;
      else if (delta < -n / 2) delta += n;
      
      // Prevent physically impossible jumps in one frame
      if (track.id === 'mexico') {
         delta = clamp(delta, -windowSize, windowSize);
      }
      
      car.lastS = s;
      if (car.finished) return;
      car.totalProgress += delta;

      // Ensure laps only count when making valid forward progress
      // Checkpoints spaced out across the lap
      if (track.id === 'mexico') {
        const lap = Math.floor(car.totalProgress / n);
        const normalizedProgress = car.totalProgress - (lap * n);
        const expectedCheckpointInLap = car.nextCheckpoint % 10;
        const checkpointSpacing = n / 10; // 10 checkpoints around the track
        
        if (normalizedProgress >= expectedCheckpointInLap * checkpointSpacing && normalizedProgress < (expectedCheckpointInLap + 1.5) * checkpointSpacing) {
           car.nextCheckpoint++;
        }
        
        if (car.totalProgress >= finishLine && car.nextCheckpoint >= 10 * track.laps - 1) {
          car.finished = true;
          car.finishOrder = ++finishCounterRef.current;
          if (car.isPlayer) endRace(car.finishOrder);
        }
      } else {
        if (car.totalProgress >= finishLine) {
          car.finished = true;
          car.finishOrder = ++finishCounterRef.current;
          if (car.isPlayer) endRace(car.finishOrder);
        }
      }
    };

    const simulate = (dt) => {
      const racing = raceStateRef.current === 'racing';
      const keys = keysRef.current;

      const playerCar = carsRef.current[carsRef.current.length - 1];

      // Dynamic rubber-banding: if the player pulls clear of the leading AI,
      // the whole pack surges to hunt them down quickly; if the player drops
      // well behind the last AI, the pack eases off only slightly, so a
      // mistake still costs real time. The multiplier lerps smoothly so pace
      // changes are never visible jumps.
      let targetBoost = 1;
      if (!playerCar.finished) {
        const aiCars = carsRef.current.filter((c) => !c.isPlayer);
        const leadAI = Math.max(...aiCars.map((c) => c.totalProgress));
        const lastAI = Math.min(...aiCars.map((c) => c.totalProgress));
        if ((playerCar.totalProgress - leadAI) * pxPerSeg > 220) targetBoost = 1.18;
        else if ((lastAI - playerCar.totalProgress) * pxPerSeg > 350) targetBoost = 0.92;
      }
      aiBoost += (targetBoost - aiBoost) * Math.min(1, 0.035 * dt);

      for (const car of carsRef.current) {
        if (car.isPlayer) {
          // High-grip handling: strong acceleration and sharp, direct
          // steering that bites even at low speed.
          if (racing) {
            if (keys.up) car.speed += 0.12 * dt;
            if (keys.down) car.speed -= (car.speed > 0.1 ? 0.16 : 0.05) * dt;
            const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
            car.heading += steer * 0.075 * clamp(car.speed / 1.6, -1, 1) * dt;
          }
          car.speed = clamp(car.speed, -1.8, 5.5);
          car.speed *= Math.pow(0.988, dt);
          if (Math.abs(car.speed) < 0.02 && !keys.up && !keys.down) car.speed = 0;
        } else {
          // Classic racingLine look-ahead for all tracks (waypoints removed).
          const lookIdx = (car.segIdx + 5) % n;
            const lp = racingLine[lookIdx];
            const lq = racingLine[(lookIdx + 1) % n];
            const tangent = Math.atan2(lq.y - lp.y, lq.x - lp.x);
            const tx = lp.x + Math.cos(tangent + Math.PI / 2) * car.lineOffset;
            const ty = lp.y + Math.sin(tangent + Math.PI / 2) * car.lineOffset;
            const diff = normalizeAngle(Math.atan2(ty - car.y, tx - car.x) - car.heading);
            car.heading += clamp(diff, -car.turnClamp * dt, car.turnClamp * dt);

            // Brake for the tightest curvature in the upcoming window, so the
            // AI slows just enough for the corner and fires out of the apex.
            let cornerGrip = 1;
            for (let a = 2; a <= 12; a++) {
              const sf = speedFactor[(car.segIdx + a) % n];
              if (sf < cornerGrip) cornerGrip = sf;
            }
            const target =
              car.maxSpeed *
              aiBoost *
              Math.max(0.6, cornerGrip) *
              (1 - Math.min(0.25, Math.abs(diff) * 0.7)) *
              (track.aiSpeedMultiplier || 1);
            car.speed =
              car.speed < target
                ? Math.min(target, car.speed + car.accel * aiBoost * dt)
                : Math.max(target, car.speed - 0.12 * dt);
        }

        car.x += Math.cos(car.heading) * car.speed * dt;
        car.y += Math.sin(car.heading) * car.speed * dt;
        updateProgress(car);
      }

      // Simple car-to-car separation so cars never stack.
      const cars = carsRef.current;
      for (let i = 0; i < cars.length; i++) {
        for (let j = i + 1; j < cars.length; j++) {
          const a = cars[i];
          const b = cars[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 17) {
            const push = (17 - dist) / 2;
            const ux = dx / dist;
            const uy = dy / dist;
            a.x -= ux * push;
            a.y -= uy * push;
            b.x += ux * push;
            b.y += uy * push;
            a.speed *= 0.985;
            b.speed *= 0.985;
          }
        }
      }
    };

    const updateHud = () => {
      hudFrameRef.current += 1;
      if (hudFrameRef.current % 8 !== 0) return;
      const standings = sortStandings();
      const player = carsRef.current.find((c) => c.isPlayer);
      const position = player.finished
        ? player.finishOrder
        : standings.findIndex((c) => c.isPlayer) + 1;
      setHud({
        lap: clamp(Math.floor(player.totalProgress / n) + 1, 1, track.laps),
        position,
        speed: Math.max(0, Math.round(player.speed * 62)),
        board: standings.map((c) => ({
          name: c.name,
          color: c.color,
          isPlayer: c.isPlayer,
          lapText: c.finished ? 'FIN' : `L${clamp(Math.floor(c.totalProgress / n) + 1, 1, track.laps)}`,
        })),
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(trackLayer, 0, 0, CANVAS_W, CANVAS_H);

      // Monaco Tunnel effect
      if (track.id === 'monaco') {
        const playerCar = carsRef.current.find(c => c.isPlayer);
        if (playerCar) {
          const progress = playerCar.segIdx / pts.length;
          let tunnelFactor = 0;
          const start = 0.50;
          const end = 0.69;
          const fade = 0.02;
          if (progress > start && progress < end) {
            if (progress < start + fade) tunnelFactor = (progress - start) / fade;
            else if (progress > end - fade) tunnelFactor = (end - progress) / fade;
            else tunnelFactor = 1;
          }
          if (tunnelFactor > 0) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.filter = 'none';
            ctx.fillStyle = `rgba(15, 23, 42, ${tunnelFactor * 0.75})`;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.restore();
          }
        }
      }
      for (const car of carsRef.current) drawCar(ctx, car);
    };

    const loop = (time) => {
      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 16.667, 2.5) : 1;
      lastTimeRef.current = time;
      if (raceStateRef.current !== 'countdown') simulate(dt);
      draw();
      updateHud();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [track]);

  return (
    <motion.div {...viewMotion}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: '960 / 600' }} />

        {/* HUD: round / lap / position */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 md:p-4">
          <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-md md:px-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-yellow-400">
              Round {track.round}/{TOTAL_ROUNDS}
            </p>
            <p className="font-display text-sm font-black uppercase tracking-wide text-white md:text-lg">
              {track.circuit}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-center backdrop-blur-md md:px-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">Lap</p>
              <p className="font-display text-sm font-black text-white md:text-lg">
                {hud.lap}/{track.laps}
              </p>
            </div>
            <div className="rounded-xl border border-yellow-400/25 bg-black/60 px-3 py-2 text-center backdrop-blur-md md:px-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">Pos</p>
              <p className="font-display text-sm font-black text-yellow-400 md:text-lg">
                {ORDINALS[hud.position - 1]}
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md sm:block md:bottom-4 md:left-4">
          {hud.board.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-center gap-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${
                row.isPlayer ? 'text-yellow-400' : 'text-zinc-300'
              }`}
            >
              <span className="w-4 text-zinc-500">{i + 1}</span>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="w-14">{row.name}</span>
              <span className="text-zinc-500">{row.lapText}</span>
            </div>
          ))}
        </div>

        {/* Speedometer + controls hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-2 md:bottom-4 md:right-4">
          <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-right backdrop-blur-md">
            <p className="font-display text-lg font-black text-white md:text-xl">{hud.speed}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">km/h</p>
          </div>
          <p className="hidden rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-400 backdrop-blur-md md:block">
            WASD / Arrow keys to drive
          </p>
        </div>

        {/* Start lights */}
        {raceState === 'countdown' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/40">
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/80 px-6 py-4 backdrop-blur-md">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`h-6 w-6 rounded-full border transition-all duration-200 md:h-8 md:w-8 ${
                    lights >= i
                      ? 'border-red-400 bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.8)]'
                      : 'border-white/15 bg-zinc-900'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-300">Get ready…</p>
          </div>
        )}

        {showGo && (
          <motion.p
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-6xl font-black uppercase text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]"
          >
            Lights Out!
          </motion.p>
        )}

        {/* Post-race overlay */}
        {raceState === 'finished' && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md md:p-8"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                  result.victory
                    ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300 shadow-[0_0_32px_rgba(250,204,21,0.3)]'
                    : 'border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_32px_rgba(239,68,68,0.25)]'
                }`}
              >
                {result.victory ? <Trophy className="h-6 w-6" /> : <Flag className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-display text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                  {result.victory ? 'Victory!' : 'Game Over!'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {ORDINALS[result.position - 1]} at {track.circuit} —{' '}
                  <span className="font-bold text-yellow-400">+{result.points} pts</span>.{' '}
                  {result.victory
                    ? isLastTrack
                      ? `Championship complete — you conquered all ${TOTAL_ROUNDS} rounds!`
                      : 'Next race unlocked!'
                    : 'Finish on the podium (top 3) to advance. Try again!'}
                </p>
              </div>

              {/* Race classification */}
              <div className="w-full rounded-xl border border-white/10 bg-black/40 p-3">
                {result.standings.map((row, i) => (
                  <div
                    key={row.name}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-widest ${
                      row.isPlayer ? 'bg-yellow-400/10 text-yellow-400' : 'text-zinc-300'
                    }`}
                  >
                    <span className="w-8 text-left text-zinc-500">P{i + 1}</span>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="flex-1 text-left">{row.name}</span>
                    <span className="text-zinc-500">+{POINTS_TABLE[i]}</span>
                  </div>
                ))}
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                {result.victory && !isLastTrack ? (
                  <button
                    type="button"
                    onClick={onNextRace}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-yellow-500/50 bg-yellow-400/10 py-2.5 text-sm font-semibold uppercase tracking-widest text-yellow-400 transition-all hover:bg-yellow-400/20"
                  >
                    <Flag className="h-4 w-4" />
                    Continue to Next Race
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-yellow-500/50 bg-yellow-400/10 py-2.5 text-sm font-semibold uppercase tracking-widest text-yellow-400 transition-all hover:bg-yellow-400/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {result.victory ? 'Race Again' : 'Try Again'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onBackToSelect}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] py-2.5 text-sm font-semibold uppercase tracking-widest text-zinc-200 transition-all hover:border-yellow-500/50 hover:text-yellow-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Calendar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToSelect}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-300 backdrop-blur-md transition hover:border-yellow-500/50 hover:text-yellow-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Exit Race
        </button>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 md:hidden">
          Keyboard required — best played on desktop
        </p>
      </div>
    </motion.div>
  );
}

/* --------------------------- Championship calendar --------------------------- */

function ChampionshipCalendar({ unlocked, results, onPick, onExit, onReset }) {
  const totalPoints = Object.values(results).reduce(
    (sum, pos) => sum + (POINTS_TABLE[pos - 1] ?? 0),
    0
  );
  const completed = Math.min(unlocked - 1, TOTAL_ROUNDS);

  return (
    <motion.div {...viewMotion}>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-300 backdrop-blur-md transition hover:border-yellow-500/50 hover:text-yellow-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Games
        </button>
        <h3 className="font-display text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
          World Championship
        </h3>
        <p className="max-w-md text-sm leading-6 text-zinc-400">
          {TOTAL_ROUNDS} rounds. Finish on the podium (top 3) to unlock the next Grand Prix.
        </p>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400">
            {totalPoints} pts
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-zinc-300">
            {completed}/{TOTAL_ROUNDS} won
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {TRACKS.map((track, index) => {
          const isUnlocked = index < unlocked;
          const isBeaten = index < unlocked - 1;
          const best = results[track.round];
          return (
            <button
              key={track.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => onPick(index)}
              className={`group relative flex flex-col gap-2 rounded-2xl border p-4 text-left backdrop-blur-md transition-all duration-300 ${
                isUnlocked
                  ? 'border-white/10 bg-white/5 hover:-translate-y-2 hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(255,255,0,0.15)]'
                  : 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    isUnlocked ? 'text-yellow-400' : 'text-zinc-600'
                  }`}
                >
                  R{track.round}
                </span>
                {isBeaten && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                {!isUnlocked && <Lock className="h-3.5 w-3.5 text-zinc-600" />}
              </div>

              {track.id === 'australia' ? (
                <svg
                  viewBox="-6 -6 237 267"
                  className={`w-full h-32 rounded-lg object-contain transition duration-300 ${
                    isUnlocked
                      ? 'opacity-90 group-hover:opacity-100 group-hover:brightness-110'
                      : 'opacity-40 grayscale'
                  }`}
                  fill="none"
                >
                  <path
                    d="M 209 235 C 207 225, 205 214, 202 203 L 198 190 C 195 180, 188 174, 179 168 L 165 158 C 159 154, 153 157, 147 155 C 133 150, 121 139, 115 128 C 109 117, 109 105, 112 92 L 116 76 C 118 68, 125 64, 127 57 C 130 48, 127 35, 124 27 C 121 19, 115 14, 107 12 C 99 9, 91 12, 82 5 C 78 2, 75 2, 71 5 C 64 10, 54 13, 45 17 C 38 20, 32 24, 29 29 L 30 61 C 23 62, 14 63, 10 66 C 15 80, 25 95, 36 106 L 55 124 C 62 131, 63 138, 58 149 C 57 153, 60 157, 64 161 L 130 226 C 136 232, 141 233, 146 229 L 154 219 C 157 215, 159 215, 162 220 L 174 242 C 177 247, 180 248, 186 246 L 209 238 Z"
                    stroke="#FACC15"
                    strokeWidth="3"
                    fill="rgba(250,204,21,0.08)"
                  />
                </svg>
              ) : (
                <img
                  src={TRACK_SVGS[track.id]}
                  alt=""
                  aria-hidden="true"
                  className={`w-full rounded-lg object-contain transition duration-300 ${
                    isUnlocked
                      ? 'opacity-90 group-hover:opacity-100 group-hover:brightness-110'
                      : 'opacity-40 grayscale'
                  }`}
                />
              )}

              <div>
                <h4
                  className={`truncate font-display text-sm font-black uppercase tracking-tight ${
                    isUnlocked ? 'text-white' : 'text-zinc-600'
                  }`}
                >
                  {track.name}
                </h4>
                <div className="mt-0.5 flex items-center justify-between">
                  <p className={`truncate text-[10px] ${isUnlocked ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {track.circuit}
                  </p>
                  {best && (
                    <span
                      className={`ml-1 shrink-0 rounded-full px-1.5 text-[9px] font-bold ${
                        best === 1
                          ? 'bg-yellow-400/15 text-yellow-400'
                          : best <= 3
                            ? 'bg-white/10 text-zinc-200'
                            : 'bg-white/5 text-zinc-500'
                      }`}
                    >
                      P{best}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 transition hover:text-red-400"
        >
          Reset championship progress
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------- Container ------------------------------ */

export default function F1Racer({ onExit }) {
  const [screen, setScreen] = useState('select');
  const [trackIndex, setTrackIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [unlocked, setUnlocked] = useState(loadUnlocked);
  const [results, setResults] = useState(loadResults);

  useEffect(() => {
    try {
      window.localStorage.setItem(UNLOCKED_KEY, String(unlocked));
      window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    } catch {
      // Storage unavailable (private mode) — progress just won't persist.
    }
  }, [unlocked, results]);

  if (screen === 'select') {
    return (
      <ChampionshipCalendar
        unlocked={unlocked}
        results={results}
        onExit={onExit}
        onReset={() => {
          setUnlocked(1);
          setResults({});
        }}
        onPick={(index) => {
          setTrackIndex(index);
          setAttempt((a) => a + 1);
          setScreen('race');
        }}
      />
    );
  }

  const track = TRACKS[trackIndex];
  return (
    <RaceScreen
      key={`${track.id}-${attempt}`}
      track={track}
      isLastTrack={trackIndex === TRACKS.length - 1}
      onFinish={(position) => {
        const round = trackIndex + 1;
        setResults((r) => (r[round] && r[round] <= position ? r : { ...r, [round]: position }));
        if (position <= 3) setUnlocked((u) => Math.max(u, trackIndex + 2));
      }}
      onRetry={() => setAttempt((a) => a + 1)}
      onNextRace={() => {
        setTrackIndex((i) => Math.min(i + 1, TRACKS.length - 1));
        setAttempt((a) => a + 1);
      }}
      onBackToSelect={() => setScreen('select')}
    />
  );
}
