import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart2, HelpCircle, Star, Trophy, ChevronsRight, Eye, EyeOff } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import Reveal from './ui/Reveal';
import {
  getAuthorizedHostProfile,
  isSupabaseConfigured,
  signInWithGoogle,
  supabase,
} from '../lib/supabase';

const RACE_SLUG = '2026-dutch-grand-prix';
const EMPTY_COUNTDOWN = { days: '--', hours: '--', minutes: '--' };

function getRaceTiming(race) {
  if (!race) return { state: 'unavailable', countdown: EMPTY_COUNTDOWN };

  const now = Date.now();
  const opensAt = Date.parse(race.opens_at);
  const closesAt = Date.parse(race.closes_at);
  const status = String(race.status ?? '').toLowerCase();

  if (!Number.isFinite(closesAt)) {
    return { state: 'unavailable', countdown: EMPTY_COUNTDOWN };
  }

  const remaining = Math.max(0, closesAt - now);
  const countdown = {
    days: String(Math.floor(remaining / 86_400_000)).padStart(2, '0'),
    hours: String(Math.floor((remaining % 86_400_000) / 3_600_000)).padStart(2, '0'),
    minutes: String(Math.floor((remaining % 3_600_000) / 60_000)).padStart(2, '0'),
  };

  if (status === 'closed' || now >= closesAt) {
    return { state: 'closed', countdown };
  }

  if (
    status !== 'open'
    || (Number.isFinite(opensAt) && now < opensAt)
  ) {
    return { state: 'upcoming', countdown };
  }

  return { state: 'open', countdown };
}

function HostLoginModal({ isOpen, onCancel, onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    emailInputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Host login is not configured yet.');
      return;
    }

    setIsLoading(true);
    let signedIn = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error || !data.user) throw error || new Error('Authentication failed');
      signedIn = true;

      const hostProfile = await getAuthorizedHostProfile(data.user.id);
      if (!hostProfile) {
        await supabase.auth.signOut();
        signedIn = false;
        setErrorMessage('This account is not authorized for host predictions.');
        return;
      }

      setPassword('');
      onAuthenticated();
    } catch {
      if (signedIn) await supabase.auth.signOut();
      setErrorMessage('Unable to sign in. Check your credentials and host access.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isLoading) onCancel();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="host-login-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 border-b border-white/10 pb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-red-500">Authorized Access</p>
              <h3 id="host-login-title" className="font-display text-3xl font-black uppercase text-white">
                Host <span className="text-yellow-400">Login</span>
              </h3>
              <p className="mt-3 text-sm text-zinc-400">
                Only authorized Yellow Flag hosts can access this area.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="host-email" className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-300">
                  Email
                </label>
                <input
                  ref={emailInputRef}
                  id="host-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-400 disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="host-password" className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="host-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 pr-20 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-400 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(current => !current)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                    className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-4 text-xs font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-yellow-400 disabled:opacity-60"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-400">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-5 py-3 font-display font-black uppercase tracking-widest text-black transition-all hover:shadow-[0_0_20px_rgba(250,204,21,0.35)] disabled:cursor-wait disabled:opacity-70"
                >
                  {isLoading ? 'Logging In...' : 'Login'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UserLoginModal({ isOpen, onCancel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    googleButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start Google sign-in. Please try again.'
      );
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isLoading) onCancel();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-login-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#121212] p-6 shadow-[0_0_50px_rgba(250,204,21,0.12)] sm:p-8"
          >
            <div className="mb-6 border-b border-white/10 pb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                Yellow Flag Predictions
              </p>
              <h3 id="user-login-title" className="font-display text-3xl font-black uppercase text-white">
                Sign in to <span className="text-yellow-400">Predict</span>
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                A Google account is required to submit predictions and track your season points.
              </p>
            </div>

            {errorMessage && (
              <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-400">
                {errorMessage}
              </p>
            )}

            <div className="space-y-3">
              <button
                ref={googleButtonRef}
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 font-display font-black uppercase tracking-wider text-black transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70"
              >
                <FcGoogle className="h-5 w-5" aria-hidden="true" />
                {isLoading ? 'Connecting...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Prediction() {
  const navigate = useNavigate();
  const [raceConfig, setRaceConfig] = useState(null);
  const [raceTiming, setRaceTiming] = useState({
    state: 'loading',
    countdown: EMPTY_COUNTDOWN,
  });
  const [isRaceLoading, setIsRaceLoading] = useState(true);
  const [raceConfigError, setRaceConfigError] = useState('');
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(false);
  const [isHostLoginOpen, setIsHostLoginOpen] = useState(false);
  const userLoginTriggerRef = useRef(null);
  const hostLoginTriggerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadRaceConfig = async () => {
      if (!supabase) {
        if (isMounted) {
          setRaceConfigError('Prediction configuration is unavailable.');
          setIsRaceLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('races')
          .select('opens_at, closes_at, status')
          .eq('slug', RACE_SLUG)
          .maybeSingle();

        if (error) throw error;
        if (!data || !Number.isFinite(Date.parse(data.closes_at))) {
          throw new Error('Race configuration is incomplete.');
        }

        if (isMounted) {
          setRaceConfig(data);
          setRaceConfigError('');
        }
      } catch {
        if (isMounted) {
          setRaceConfig(null);
          setRaceConfigError('Prediction configuration is unavailable.');
        }
      } finally {
        if (isMounted) setIsRaceLoading(false);
      }
    };

    loadRaceConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!raceConfig) {
      setRaceTiming({
        state: isRaceLoading ? 'loading' : 'unavailable',
        countdown: EMPTY_COUNTDOWN,
      });
      return undefined;
    }

    const updateRaceTiming = () => setRaceTiming(getRaceTiming(raceConfig));
    updateRaceTiming();

    const intervalId = window.setInterval(updateRaceTiming, 1000);
    return () => window.clearInterval(intervalId);
  }, [raceConfig, isRaceLoading]);

  const closeUserLogin = () => {
    setIsUserLoginOpen(false);
    requestAnimationFrame(() => userLoginTriggerRef.current?.focus());
  };

  const closeHostLogin = () => {
    setIsHostLoginOpen(false);
    requestAnimationFrame(() => hostLoginTriggerRef.current?.focus());
  };

  const handleHostAuthenticated = () => {
    setIsHostLoginOpen(false);
    navigate('/predictions/dutch-grand-prix');
  };

  const handlePredictionClick = async () => {
    if (raceTiming.state !== 'open') return;

    if (!supabase) {
      setIsUserLoginOpen(true);
      return;
    }

    setIsSessionChecking(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session?.user) {
        navigate('/predictions/dutch-grand-prix');
      } else {
        setIsUserLoginOpen(true);
      }
    } catch {
      setIsUserLoginOpen(true);
    } finally {
      setIsSessionChecking(false);
    }
  };

  const isPredictionOpen = raceTiming.state === 'open';
  const predictionStatusLabel = isRaceLoading
    ? 'Loading Race Predictions'
    : raceConfigError || raceTiming.state === 'unavailable'
      ? 'Race Predictions Unavailable'
      : isPredictionOpen
        ? 'Race Predictions Are Open'
        : raceTiming.state === 'closed'
          ? 'Race Predictions Are Closed'
          : 'Race Predictions Open Soon';

  const predictionButtonLabel = isSessionChecking
    ? 'Checking Session...'
    : isRaceLoading
      ? 'Loading Predictions...'
      : isPredictionOpen
        ? 'Make Your Prediction'
        : raceTiming.state === 'closed'
          ? 'Predictions Closed'
          : 'Predictions Unavailable';

  return (
    <section id="prediction" className="relative py-16 md:py-24">
      {/* Background accents similar to other sections */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 lg:items-center">
          
          {/* Left Column: Prediction Info & CTA */}
          <Reveal className="flex flex-col items-start">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-black">
              <BarChart2 className="h-4 w-4" strokeWidth={3} />
              {predictionStatusLabel}
            </div>

            {/* Title */}
            <h2 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-[0.02em] text-white md:text-7xl">
              Dutch Grand Prix<br />
              <span className="text-yellow-400">Prediction</span>
            </h2>

            {/* Circuit Name & Flag */}
            <div className="mt-4 flex items-center gap-3 font-display text-xl font-bold uppercase tracking-widest text-zinc-400">
              Circuit Zandvoort
              <img 
                src="https://flagcdn.com/w40/nl.png" 
                srcSet="https://flagcdn.com/w80/nl.png 2x" 
                width="24" 
                height="16" 
                alt="Netherlands Flag" 
                className="rounded-sm shadow-sm"
              />
            </div>

            {/* Countdown Timer */}
            <div className="mt-8 flex w-full max-w-md items-center justify-between rounded-xl border border-white/10 bg-[#121212] py-4 px-6 md:px-10">
              <div className="flex flex-col items-center">
                <span className="font-display text-4xl font-black leading-none text-white md:text-5xl">{raceTiming.countdown.days}</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Days</span>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="font-display text-4xl font-black leading-none text-white md:text-5xl">{raceTiming.countdown.hours}</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Hours</span>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="font-display text-4xl font-black leading-none text-white md:text-5xl">{raceTiming.countdown.minutes}</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Min</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              ref={userLoginTriggerRef}
              type="button"
              onClick={handlePredictionClick}
              disabled={isSessionChecking || !isPredictionOpen}
              className="group mt-6 flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 py-4 font-display text-lg font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] disabled:cursor-wait disabled:opacity-70"
            >
              {predictionButtonLabel}
              <ChevronsRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
            </button>

            {/* Closing Note */}
            <p className="mt-4 w-full max-w-md text-center text-sm italic text-zinc-500">
              {isPredictionOpen
                ? 'Predictions lock when Free Practice 1 begins'
                : raceConfigError
                  ? 'Prediction timing is temporarily unavailable'
                  : raceTiming.state === 'closed'
                    ? 'The prediction window is closed'
                    : 'Predictions are not open yet'}
            </p>
          </Reveal>

          {/* Right Column: Cards */}
          <Reveal delay={0.2} className="flex flex-col gap-6">
            
            {/* Circuit Outline & Stats Card */}
            <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-6 sm:flex-row sm:p-8">
              {/* Grid Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
              
              {/* Zandvoort SVG Outline (Approximate placeholder path) */}
              <div className="relative flex-1 p-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                <svg viewBox="0 0 300 200" className="w-full h-auto max-w-[280px]">
                  <path 
                    d="M 50 120 C 30 110, 20 80, 40 50 C 60 20, 100 30, 120 50 L 150 70 L 170 50 C 190 30, 220 20, 250 30 C 280 40, 290 70, 260 100 L 210 130 C 190 140, 150 150, 120 120 L 90 90 L 70 140 C 60 160, 40 160, 50 120 Z" 
                    fill="none" 
                    stroke="#FBBF24" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  {/* Start/Finish Line Indicator */}
                  <g transform="translate(145, 145) rotate(-20)">
                    <rect x="0" y="0" width="4" height="4" fill="white" />
                    <rect x="4" y="0" width="4" height="4" fill="black" />
                    <rect x="0" y="4" width="4" height="4" fill="black" />
                    <rect x="4" y="4" width="4" height="4" fill="white" />
                    <rect x="8" y="0" width="4" height="4" fill="white" />
                    <rect x="12" y="0" width="4" height="4" fill="black" />
                    <rect x="8" y="4" width="4" height="4" fill="black" />
                    <rect x="12" y="4" width="4" height="4" fill="white" />
                    <rect x="-4" y="0" width="4" height="4" fill="black" />
                    <rect x="-4" y="4" width="4" height="4" fill="white" />
                  </g>
                </svg>
              </div>

              {/* Stats Column */}
              <div className="relative mt-8 flex w-full flex-row justify-around gap-4 sm:mt-0 sm:w-auto sm:flex-col">
                <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-400">
                    <HelpCircle className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-black leading-none text-white">7</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Questions</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-400">
                    <Star className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-black leading-none text-white">Max 7</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Points</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hosts Championship Card */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Trophy className="h-5 w-5 text-yellow-400" strokeWidth={2} />
                  <span className="font-display text-lg font-bold uppercase tracking-wider">Hosts Championship</span>
                </div>
                {/* Red Dots Pattern / Host Login */}
                <button
                  ref={hostLoginTriggerRef}
                  type="button"
                  onClick={() => setIsHostLoginOpen(true)}
                  aria-label="Host Login"
                  className="group relative flex cursor-pointer gap-1.5 border-0 bg-transparent p-0"
                >
                  <span className="grid grid-cols-5 gap-1.5 opacity-50">
                    {[...Array(10)].map((_, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    ))}
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded border border-red-500/30 bg-black px-2 py-1 text-[10px] font-bold tracking-widest text-red-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    HOST LOGIN
                  </span>
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
                {/* Lakindu Score */}
                <div className="flex flex-col items-end">
                  <span className="font-display text-lg font-bold uppercase tracking-widest text-zinc-400 sm:text-xl">Lakindu</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-black text-yellow-400 sm:text-6xl">68</span>
                    <span className="font-display font-bold text-zinc-500">PTS</span>
                  </div>
                </div>

                {/* VS Badge */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-800 bg-zinc-900 shadow-inner">
                  <span className="font-display text-xl font-black text-zinc-400">VS</span>
                  {/* Decorative parentheses */}
                  <span className="absolute -left-6 text-4xl font-light text-yellow-400/30">)</span>
                  <span className="absolute -right-6 text-4xl font-light text-red-600/30">(</span>
                </div>

                {/* Kasun Score */}
                <div className="flex flex-col items-start">
                  <span className="font-display text-lg font-bold uppercase tracking-widest text-zinc-400 sm:text-xl">Kasun</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-black text-red-600 sm:text-6xl">72</span>
                    <span className="font-display font-bold text-zinc-500">PTS</span>
                  </div>
                </div>
              </div>
            </div>

          </Reveal>
        </div>
      </div>

      <HostLoginModal
        isOpen={isHostLoginOpen}
        onCancel={closeHostLogin}
        onAuthenticated={handleHostAuthenticated}
      />
      <UserLoginModal
        isOpen={isUserLoginOpen}
        onCancel={closeUserLogin}
      />
    </section>
  );
}
