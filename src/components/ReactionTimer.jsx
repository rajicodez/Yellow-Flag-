import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Timer } from 'lucide-react';

const BEST_KEY = 'yf-reaction-best';
const LIGHTS_OUT_SOUND = '/audio/f1-lights-out.mp3';

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

let sharedAudioCtx = null;
let sharedAudioBuffer = null;
let sharedGainNode = null;
let audioInitPromise = null;

function initWebAudio() {
  if (!sharedAudioCtx) {
    console.log('[ReactionAudio] AudioContext created');
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      sharedAudioCtx = new AudioContext();
      sharedGainNode = sharedAudioCtx.createGain();
      sharedGainNode.gain.value = 0.5;
      sharedGainNode.connect(sharedAudioCtx.destination);
    } catch (err) {
      console.error('[ReactionAudio] AudioContext creation failed:', err);
      return Promise.resolve(); // fallback
    }
  }

  let resumePromise = Promise.resolve();
  console.log('[ReactionAudio] AudioContext state before resume:', sharedAudioCtx.state);
  if (sharedAudioCtx.state === 'suspended') {
    resumePromise = sharedAudioCtx.resume().then(() => {
      console.log('[ReactionAudio] AudioContext state after resume:', sharedAudioCtx.state);
    });
  } else {
    console.log('[ReactionAudio] AudioContext state after resume:', sharedAudioCtx.state);
  }

  if (sharedAudioBuffer) {
    return resumePromise;
  }

  if (!audioInitPromise) {
    const resolvedUrl = new URL(LIGHTS_OUT_SOUND, window.location.origin).href;
    console.log('[ReactionAudio] Sound asset request started:', resolvedUrl);
    audioInitPromise = fetch(LIGHTS_OUT_SOUND)
      .then((res) => {
        console.log('[ReactionAudio] HTTP status:', res.status, 'Content type:', res.headers.get('content-type'));
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${resolvedUrl}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        console.log('[ReactionAudio] Audio data loaded, bytes:', arrayBuffer.byteLength);
        return sharedAudioCtx.decodeAudioData(arrayBuffer);
      })
      .then((audioBuffer) => {
        sharedAudioBuffer = audioBuffer;
        console.log('[ReactionAudio] Audio decoded, duration:', audioBuffer.duration);
      })
      .catch((err) => {
        console.error('[ReactionAudio] Sound asset request failed:', err);
        audioInitPromise = null; // allow retry on failure
      });
  }
  
  return resumePromise.then(() => audioInitPromise);
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
  const attemptRef = useRef(0);
  const activeSourceRef = useRef(null);
  const animationRef = useRef(null);

  const setPhaseSafe = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  const stopAudio = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      activeSourceRef.current.disconnect();
      activeSourceRef.current = null;
    }
  };

  // Clear all pending timeouts on unmount so nothing leaks or fires late.
  useEffect(() => {
    console.log('[ReactionAudio] Reaction Timer component mounted');
    console.log('[ReactionAudio] Sound asset URL resolved:', LIGHTS_OUT_SOUND);
    return () => {
      clearTimers();
      stopAudio();
    };
  }, []);

  const playLightsOutSound = (expectedAttempt) => {
    console.log('[ReactionAudio] Sound playback function called');
    console.log('[ReactionAudio] Attempt ID validated:', attemptRef.current === expectedAttempt);
    if (attemptRef.current !== expectedAttempt) return;
    
    if (!sharedAudioCtx || !sharedAudioBuffer) {
      console.error('[ReactionAudio] Playback failed: AudioContext or AudioBuffer not ready');
      return;
    }

    try {
      console.log('[ReactionAudio] Audio source created');
      const source = sharedAudioCtx.createBufferSource();
      source.buffer = sharedAudioBuffer;
      console.log('[ReactionAudio] Gain/volume value:', sharedGainNode.gain.value);
      console.log('[ReactionAudio] Audio source connected to destination');
      source.connect(sharedGainNode);
      
      console.log('[ReactionAudio] source.start() called');
      source.start();
      activeSourceRef.current = source;
      
      source.onended = () => {
        console.log('[ReactionAudio] Playback completed');
      };
    } catch (err) {
      console.error('[ReactionAudio] Playback failed:', err);
    }
  };

  const LIGHT_CUE_MS = [1000, 2000, 3000, 4000, 5000];
  const LIGHTS_OUT_MS = 6000;

  const startSequence = async () => {
    clearTimers();
    stopAudio();
    setResult(null);
    setLitCount(0);
    
    attemptRef.current += 1;
    const currentAttempt = attemptRef.current;
    
    console.log('[ReactionAudio] START button clicked');
    
    await initWebAudio();
    if (attemptRef.current !== currentAttempt) return;
    
    setPhaseSafe('running');
    
    // Start audio at sequence time 0
    playLightsOutSound(currentAttempt);

    const startTime = performance.now();
    let loggedCues = { 1: false, 2: false, 3: false, 4: false, 5: false, out: false };

    const tick = () => {
      if (phaseRef.current !== 'running' || attemptRef.current !== currentAttempt) return;
      
      const elapsed = performance.now() - startTime;
      
      let nextLitCount = 0;
      if (elapsed >= LIGHTS_OUT_MS) {
        if (!loggedCues.out) {
            console.log(`[ReactionSync] Lights-out expected=${LIGHTS_OUT_MS} actual=${Math.round(elapsed)} drift=${Math.round(elapsed - LIGHTS_OUT_MS)}ms`);
            loggedCues.out = true;
        }
        
        console.log('[ReactionAudio] Lights changed to off');
        setLitCount(0);
        console.log('[ReactionAudio] Reaction start timestamp recorded');
        goTimeRef.current = performance.now();
        setPhaseSafe('go');
        
        stopAudio(); // cut trailing silence
        return;
      } else if (elapsed >= LIGHT_CUE_MS[4]) {
        if (!loggedCues[5]) {
            console.log(`[ReactionSync] Light 5 expected=${LIGHT_CUE_MS[4]} actual=${Math.round(elapsed)} drift=${Math.round(elapsed - LIGHT_CUE_MS[4])}ms`);
            loggedCues[5] = true;
        }
        nextLitCount = 5;
      } else if (elapsed >= LIGHT_CUE_MS[3]) {
        if (!loggedCues[4]) {
            console.log(`[ReactionSync] Light 4 expected=${LIGHT_CUE_MS[3]} actual=${Math.round(elapsed)} drift=${Math.round(elapsed - LIGHT_CUE_MS[3])}ms`);
            loggedCues[4] = true;
        }
        nextLitCount = 4;
      } else if (elapsed >= LIGHT_CUE_MS[2]) {
        if (!loggedCues[3]) {
            console.log(`[ReactionSync] Light 3 expected=${LIGHT_CUE_MS[2]} actual=${Math.round(elapsed)} drift=${Math.round(elapsed - LIGHT_CUE_MS[2])}ms`);
            loggedCues[3] = true;
        }
        nextLitCount = 3;
      } else if (elapsed >= LIGHT_CUE_MS[1]) {
        if (!loggedCues[2]) {
            console.log(`[ReactionSync] Light 2 expected=${LIGHT_CUE_MS[1]} actual=${Math.round(elapsed)} drift=${Math.round(elapsed - LIGHT_CUE_MS[1])}ms`);
            loggedCues[2] = true;
        }
        nextLitCount = 2;
      } else if (elapsed >= LIGHT_CUE_MS[0]) {
        if (!loggedCues[1]) {
            console.log(`[ReactionSync] Light 1 expected=${LIGHT_CUE_MS[0]} actual=${Math.round(elapsed)} drift=${Math.round(elapsed - LIGHT_CUE_MS[0])}ms`);
            loggedCues[1] = true;
        }
        nextLitCount = 1;
      }
      
      setLitCount(prev => {
        if (prev !== nextLitCount) return nextLitCount;
        return prev;
      });
      
      animationRef.current = requestAnimationFrame(tick);
    };
    
    animationRef.current = requestAnimationFrame(tick);
  };

  const react = () => {
    const current = phaseRef.current;
    if (current === 'idle' || current === 'result' || current === 'jump') {
      startSequence();
      return;
    }
    if (current === 'running') {
      clearTimers();
      stopAudio();
      attemptRef.current += 1; // Invalidate current attempt
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
                className={`h-12 w-12 rounded-full md:h-16 md:w-16 ${
                  phase === 'go' ? 'transition-none' : 'transition-all duration-150'
                } ${
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
