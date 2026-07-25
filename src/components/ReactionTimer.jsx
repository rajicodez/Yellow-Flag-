import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Timer } from 'lucide-react';

const BEST_KEY = 'yf-reaction-best';
const LIGHTS_OUT_SOUND = 'https://www.myinstants.com/media/sounds/f1-lights-out.mp3';

const viewMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
};

function tierFor(seconds) {
  if (seconds < 0.2) return { label: 'World Champion Level!', color: 'text-yellow-400' };
  if (seconds < 0.3) return { label: 'Podium Contender', color: 'text-green-400' };
  if (seconds < 0.4) return { label: 'Solid Midfield Pace', color: 'text-zinc-300' };
  return { label: 'Tractor Driver', color: 'text-red-400' };
}

function loadBest() {
  try {
    const value = Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '');
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export default function ReactionTimer({ onExit }) {
  // idle -> running (lights building + random hold) -> go -> result | jump
  const [phase, setPhase] = useState('idle');
  const [litCount, setLitCount] = useState(0);
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(loadBest);

  const phaseRef = useRef('idle');
  const timeoutsRef = useRef([]);
  const goTimeRef = useRef(0);
  const audioRef = useRef(null);

  const setPhaseSafe = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  // Clear all pending timeouts on unmount so nothing leaks or fires late.
  useEffect(() => clearTimers, []);

  const playLightsOutSound = () => {
    try {
      if (!audioRef.current) audioRef.current = new Audio(LIGHTS_OUT_SOUND);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay/network restrictions — the game works fine without sound.
      });
    } catch {
      // Audio unsupported — ignore.
    }
  };

  const startSequence = () => {
    clearTimers();
    setResult(null);
    setLitCount(0);
    setPhaseSafe('running');

    // One new red light every second.
    for (let i = 1; i <= 5; i++) {
      timeoutsRef.current.push(window.setTimeout(() => setLitCount(i), i * 1000));
    }

    // After all five are lit, hold for a random 0.5s - 3.0s, then lights out.
    const holdDelay = 500 + Math.random() * 2500;
    timeoutsRef.current.push(
      window.setTimeout(() => {
        setLitCount(0);
        goTimeRef.current = performance.now();
        setPhaseSafe('go');
        playLightsOutSound();
      }, 5000 + holdDelay)
    );
  };

  const react = () => {
    const current = phaseRef.current;
    if (current === 'idle' || current === 'result' || current === 'jump') {
      startSequence();
      return;
    }
    if (current === 'running') {
      clearTimers();
      setLitCount(0);
      setPhaseSafe('jump');
      return;
    }
    if (current === 'go') {
      const seconds = (performance.now() - goTimeRef.current) / 1000;
      setResult(seconds);
      setPhaseSafe('result');
      setBest((prev) => {
        const next = prev === null || seconds < prev ? seconds : prev;
        try {
          window.localStorage.setItem(BEST_KEY, String(next));
        } catch {
          // Storage unavailable — best time just won't persist.
        }
        return next;
      });
    }
  };

  // Spacebar / Enter react too, for desktop players.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        react();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tier = result !== null ? tierFor(result) : null;

  return (
    <motion.div {...viewMotion} className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-300 backdrop-blur-md transition hover:border-yellow-500/50 hover:text-yellow-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Games
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-300 backdrop-blur-md">
          <Timer className="h-3.5 w-3.5 text-yellow-400" />
          Best {best !== null ? `${best.toFixed(3)}s` : '—'}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
        {/* Lights gantry */}
        <div className="flex justify-center border-b border-white/10 bg-black/60 px-4 py-8 md:py-10">
          <div className="flex gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)] md:gap-4 md:px-7 md:py-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`h-12 w-12 rounded-full transition-all duration-150 md:h-16 md:w-16 ${
                  litCount >= i
                    ? 'border border-red-400 bg-red-600 shadow-[0_0_30px_rgba(220,38,38,1)]'
                    : 'border border-red-900/50 bg-red-950/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Giant hit area */}
        <button
          type="button"
          onPointerDown={react}
          className={`flex min-h-[16rem] w-full select-none flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-colors duration-150 md:min-h-[18rem] ${
            phase === 'go' ? 'bg-green-500/10' : phase === 'jump' ? 'bg-red-500/10' : 'hover:bg-white/[0.03]'
          }`}
        >
          {phase === 'idle' && (
            <>
              <p className="font-display text-3xl font-black uppercase tracking-[0.02em] text-white md:text-4xl">
                Tap to Start
              </p>
              <p className="max-w-sm text-sm leading-6 text-zinc-400">
                Five red lights come on one by one. The instant they all go out — react! Tap anywhere in
                this area, or hit Space.
              </p>
            </>
          )}

          {phase === 'running' && (
            <>
              <p className="font-display text-2xl font-black uppercase tracking-[0.2em] text-red-400 md:text-3xl">
                Wait for lights out…
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Tapping early is a jump start
              </p>
            </>
          )}

          {phase === 'go' && (
            <motion.p
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="font-display text-5xl font-black uppercase tracking-[0.02em] text-green-400 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)] md:text-6xl"
            >
              GO!
            </motion.p>
          )}

          {phase === 'jump' && (
            <>
              <motion.p
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="font-display text-3xl font-black uppercase tracking-[0.02em] text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.5)] md:text-5xl"
              >
                Jump Start!
              </motion.p>
              <p className="text-sm font-bold uppercase tracking-widest text-red-400">Too early</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Tap to try again
              </p>
            </>
          )}

          {phase === 'result' && result !== null && (
            <>
              <motion.p
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-6xl font-black tracking-[0.02em] text-white md:text-7xl"
              >
                {result.toFixed(3)}
                <span className="text-3xl text-zinc-400 md:text-4xl">s</span>
              </motion.p>
              <p className={`text-sm font-black uppercase tracking-[0.2em] md:text-base ${tier.color}`}>
                {tier.label}
              </p>
              {best !== null && result <= best && (
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                  New personal best!
                </p>
              )}
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Tap to go again
              </p>
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        F1 drivers react in around 0.2 seconds — beat the pros!
      </p>
    </motion.div>
  );
}
