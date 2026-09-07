import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart2, HelpCircle, Star, Trophy, ChevronsRight } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import Reveal from './ui/Reveal';
import {
  getAuthorizedHostProfile,
  isSupabaseConfigured,
  signInWithGoogle,
  supabase,
} from '../lib/supabase';

const EMPTY_COUNTDOWN = { days: '--', hours: '--', minutes: '--' };

const ZANDVOORT_PHOTO = {
  src: '/images/circuits/dutch-grand-prix.jpg',
  alt: 'Aerial view of Circuit Zandvoort beside the North Sea',
  credit: 'Quistnix / Wikimedia Commons',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Circuit_Park_Zandvoort_aerial_photo.jpg',
};

const MONZA_PHOTO = {
  src: '/images/circuits/italian-grand-prix.jpg',
  alt: 'Satellite view of Autodromo Nazionale Monza and the surrounding park',
  credit: 'Planet Labs, Inc. / Wikimedia Commons',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Autodromo_Nazionale_Monza,_April_22,_2018_SkySat_(cropped).jpg',
};

const MADRING_PHOTO = {
  src: '/images/circuits/spanish-grand-prix.jpg',
  alt: 'Aerial view of Valdebebas in Madrid, where the Madring circuit is located',
  credit: 'Michiel1972 / Balbo / Wikimedia Commons',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Valdebebas_Madrid.jpg',
};

const CIRCUIT_PHOTOS = {
  'dutch-grand-prix': ZANDVOORT_PHOTO,
  '2026-dutch-grand-prix': ZANDVOORT_PHOTO,
  'italian-grand-prix': MONZA_PHOTO,
  '2026-italian-grand-prix': MONZA_PHOTO,
  'spanish-grand-prix': MADRING_PHOTO,
  '2026-spanish-grand-prix': MADRING_PHOTO,
  madring: MADRING_PHOTO,
  '2026-madring': MADRING_PHOTO,
};

function getCircuitPhoto(race) {
  if (!race?.slug) return null;
  return CIRCUIT_PHOTOS[race.slug] ?? null;
}

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

  if (['locked', 'scored', 'published'].includes(status) || now >= closesAt) {
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

function HostLoginModal({ isOpen, onCancel, onAuthenticated, redirectPath }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    setErrorMessage('');
    googleButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  const handleGoogleSignIn = async () => {
    setErrorMessage('');

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Host login is not configured yet.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session?.user) {
        const hostProfile = await getAuthorizedHostProfile(data.session.user.id);
        if (hostProfile) {
          setIsLoading(false);
          onAuthenticated();
          return;
        }
      }

      await signInWithGoogle(redirectPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start Google sign-in.');
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
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Continue with Lakindu or Kasun's approved Google account. Host predictions are kept separate from fan entries.
              </p>
            </div>

            <div className="space-y-4">
              {errorMessage && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-400">
                  {errorMessage}
                </p>
              )}

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
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UserLoginModal({ isOpen, onCancel, redirectPath }) {
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
      await signInWithGoogle(redirectPath);
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
  const [hostChampionship, setHostChampionship] = useState({
    loading: true,
    seasonYear: new Date().getFullYear(),
    scores: { Lakindu: 0, Kasun: 0 },
    racesScored: 0,
  });
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
          .select('slug, race_name, circuit_name, country_code, race_starts_at, opens_at, closes_at, status, seasons(year)')
          .neq('status', 'draft')
          .order('race_starts_at', { ascending: true });

        if (error) throw error;
        const now = Date.now();
        const selectedRace = (data ?? []).find((race) => race.status === 'open' && Date.parse(race.closes_at) > now)
          ?? (data ?? []).find((race) => Date.parse(race.race_starts_at) > now)
          ?? (data ?? []).at(-1);
        if (!selectedRace || !Number.isFinite(Date.parse(selectedRace.closes_at))) {
          throw new Error('Race configuration is incomplete.');
        }

        if (isMounted) {
          setRaceConfig(selectedRace);
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

  useEffect(() => {
    if (!raceConfig || !supabase) return undefined;
    let isMounted = true;
    const seasonYear = Number(raceConfig.seasons?.year)
      || new Date(raceConfig.race_starts_at).getFullYear();

    setHostChampionship((current) => ({ ...current, loading: true, seasonYear }));
    supabase.rpc('get_public_host_championship', { p_season_year: seasonYear })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setHostChampionship({ loading: false, seasonYear, scores: { Lakindu: null, Kasun: null }, racesScored: 0 });
          return;
        }

        const scores = { Lakindu: 0, Kasun: 0 };
        let racesScored = 0;
        for (const row of data ?? []) {
          if (row.host_name in scores) scores[row.host_name] = Number(row.total_score ?? 0);
          racesScored += Number(row.races_scored ?? 0);
        }
        setHostChampionship({ loading: false, seasonYear, scores, racesScored });
      });

    return () => { isMounted = false; };
  }, [raceConfig]);

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
    navigate(`/predictions/${raceConfig.slug}?competition=host`);
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
        navigate(`/predictions/${raceConfig.slug}`);
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
  const circuitPhoto = getCircuitPhoto(raceConfig);

  return (
    <section id="prediction" className="relative scroll-mt-24 py-16 md:py-24">
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
              {raceConfig?.race_name ?? 'Grand Prix'}<br />
              <span className="text-yellow-400">Prediction</span>
            </h2>

            {/* Circuit Name & Flag */}
            <div className="mt-4 flex items-center gap-3 font-display text-xl font-bold uppercase tracking-widest text-zinc-400">
              {raceConfig?.circuit_name ?? 'Formula 1'}
              {raceConfig?.country_code && <img
                src={`https://flagcdn.com/w40/${raceConfig.country_code.toLowerCase()}.png`}
                srcSet={`https://flagcdn.com/w80/${raceConfig.country_code.toLowerCase()}.png 2x`}
                width="24" 
                height="16" 
                alt={`${raceConfig.country_code} flag`}
                className="rounded-sm shadow-sm"
              />}
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
            
            {/* Upcoming circuit photo & stats card */}
            <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
              {circuitPhoto ? (
                <img
                  src={circuitPhoto.src}
                  alt={circuitPhoto.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(250,204,21,0.2),transparent_45%),linear-gradient(135deg,#242015,#090909_65%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/45 to-black/90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/15" />

              <div className="relative flex min-h-[340px] flex-col justify-between p-6 sm:flex-row sm:items-stretch sm:p-8">
                <div className="flex max-w-xs flex-col justify-end pr-4">
                  <span className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Next Grand Prix</span>
                  <h3 className="font-display text-2xl font-black uppercase leading-tight text-white sm:text-3xl">
                    {raceConfig?.circuit_name ?? 'Formula 1 Circuit'}
                  </h3>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                    {raceConfig?.race_name ?? 'Upcoming race'}
                  </p>
                  {circuitPhoto && (
                    <a
                      href={circuitPhoto.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-fit text-[9px] font-semibold text-white/45 transition hover:text-white/75"
                    >
                      Photo: {circuitPhoto.credit} · CC BY-SA 3.0
                    </a>
                  )}
                </div>

                <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:mt-0 sm:flex sm:w-auto sm:flex-col sm:justify-center sm:gap-3">
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-2 py-3 backdrop-blur-sm transition-colors hover:bg-white/10 sm:gap-4 sm:px-6 sm:py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-400 sm:h-12 sm:w-12">
                    <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-xl font-black leading-none text-white sm:text-2xl">7</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-yellow-400 sm:text-xs sm:tracking-widest">Questions</div>
                  </div>
                </div>
                
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-2 py-3 backdrop-blur-sm transition-colors hover:bg-white/10 sm:gap-4 sm:px-6 sm:py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-400 sm:h-12 sm:w-12">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="whitespace-nowrap font-display text-xl font-black leading-none text-white sm:text-2xl">Max 7</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-yellow-400 sm:text-xs sm:tracking-widest">Points</div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Hosts Championship Card */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-6 sm:p-8">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 text-white">
                  <Trophy className="h-5 w-5 text-yellow-400" strokeWidth={2} />
                  <span className="font-display text-lg font-bold uppercase tracking-wider">Hosts Championship</span>
                </div>
                <button
                  ref={hostLoginTriggerRef}
                  type="button"
                  onClick={() => setIsHostLoginOpen(true)}
                  className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-yellow-400/35 bg-yellow-400/10 px-4 py-2.5 font-display text-xs font-black uppercase tracking-[0.14em] text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
                >
                  Host Prediction
                  <ChevronsRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
                {/* Lakindu Score */}
                <div className="flex flex-col items-end">
                  <span className="font-display text-lg font-bold uppercase tracking-widest text-zinc-400 sm:text-xl">Lakindu</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-black text-yellow-400 sm:text-6xl">{hostChampionship.loading ? '—' : hostChampionship.scores.Lakindu ?? '—'}</span>
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
                    <span className="font-display text-5xl font-black text-red-600 sm:text-6xl">{hostChampionship.loading ? '—' : hostChampionship.scores.Kasun ?? '—'}</span>
                    <span className="font-display font-bold text-zinc-500">PTS</span>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {hostChampionship.racesScored
                  ? `Published ${hostChampionship.seasonYear} Host Championship points`
                  : `No published Host scores yet for ${hostChampionship.seasonYear}`}
              </p>
            </div>

          </Reveal>
        </div>
      </div>

      <HostLoginModal
        isOpen={isHostLoginOpen}
        onCancel={closeHostLogin}
        onAuthenticated={handleHostAuthenticated}
        redirectPath={raceConfig?.slug ? `/predictions/${raceConfig.slug}?competition=host` : '/'}
      />
      <UserLoginModal
        isOpen={isUserLoginOpen}
        onCancel={closeUserLogin}
        redirectPath={raceConfig?.slug ? `/predictions/${raceConfig.slug}` : '/'}
      />
    </section>
  );
}
