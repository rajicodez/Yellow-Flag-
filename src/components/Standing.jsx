import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getDriverAvatar, getDriverInitials } from '../data/driverAvatars';
import { getConstructorMeta, standingsIntro } from '../data/standings';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

const DRIVER_STANDINGS_URL = 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json';
const CONSTRUCTOR_STANDINGS_URL = 'https://api.jolpi.ca/ergast/f1/current/constructorStandings.json';

const TEAM_COLORS = {
  red_bull: '#3671C6',
  ferrari: '#E80020',
  mclaren: '#FF8000',
  mercedes: '#27F4D2',
  alpine: '#0093CC',
  rb: '#6692FF',
  racing_bulls: '#6692FF',
  haas: '#B6BABD',
  williams: '#005AFF',
  audi: '#52E252',
  sauber: '#52E252',
  kick_sauber: '#52E252',
  aston_martin: '#006F62',
  cadillac: '#C4A052',
};

function getTeamColor(constructorId) {
  return TEAM_COLORS[constructorId] ?? '#FACC15';
}

function getSurname(fullName) {
  return fullName.split(' ').pop()?.toUpperCase() ?? fullName.toUpperCase();
}

function DriverAvatar({ name, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = getDriverAvatar(name);
  const initials = getDriverInitials(name);
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-12 w-12 text-xs';

  if (!avatarUrl || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 font-display font-black text-white/70 ${sizeClass}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`shrink-0 rounded-full border border-white/10 object-cover object-top ${sizeClass}`}
      onError={() => setFailed(true)}
    />
  );
}

function ConstructorLogo({ logoUrl, invertLogo, name }) {
  const [failed, setFailed] = useState(false);
  const initials = (name ?? '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!logoUrl || failed) {
    return (
      <span className="mr-3 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 align-middle font-display text-[9px] font-black text-white/60 md:h-8 md:w-8">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`mr-3 inline-block h-7 w-7 shrink-0 align-middle object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] md:h-8 md:w-8 ${
        invertLogo ? 'invert brightness-200' : ''
      }`}
      onError={() => setFailed(true)}
    />
  );
}

function StartingGridCard({ position, name, points, teamColorCode, subtitle, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.025, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02 }}
      className="flex flex-row items-stretch overflow-hidden shadow-lg"
    >
      <div className="flex w-14 shrink-0 items-center justify-center rounded-l-2xl bg-white md:w-16">
        <span className="font-display text-2xl font-black text-black md:text-3xl">{position}</span>
      </div>

      <div
        className="flex min-w-0 flex-1 items-center gap-3 rounded-r-2xl px-3 py-2.5 md:gap-4 md:px-4 md:py-3"
        style={{ backgroundColor: teamColorCode }}
      >
        <DriverAvatar name={name} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-black uppercase tracking-wide text-white md:text-lg">
            {getSurname(name)}
          </p>
          {subtitle && (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 md:text-xs">
              {subtitle}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">Pts</p>
          <p className="font-display text-xl font-black text-white md:text-2xl">{points}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ConstructorStandingsTable({ items, season }) {
  return (
    <motion.div
      key="constructors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-8 text-center">
        <h3 className="font-display text-3xl font-black uppercase italic leading-none tracking-[0.02em] text-white md:text-5xl">
          <span className="text-white">Championship </span>
          <span className="text-red-600">Grid</span>
        </h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.28em] text-zinc-400 md:text-sm">
          {`${season || '2026'} Constructor Standings`}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 md:px-6">
          <span>Pos · Team</span>
          <span>Pts</span>
        </div>

        <ul>
          {items.map((item, index) => (
            <motion.li
              key={`constructor-${item.constructorId}-${item.position}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="flex items-center justify-between border-b border-white/10 px-4 py-4 last:border-b-0 md:px-6 md:py-5"
            >
              <div className="flex min-w-0 items-center">
                <span className="mr-3 w-7 shrink-0 font-display text-lg font-black text-white md:mr-4 md:w-8 md:text-xl">
                  {item.position}
                </span>
                <ConstructorLogo
                  logoUrl={item.logoUrl}
                  invertLogo={item.invertLogo}
                  name={item.team}
                />
                <p className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-wide text-white md:text-base">
                  {item.team}
                </p>
              </div>

              <p className="shrink-0 pl-4 font-display text-xl font-black text-white md:text-2xl">
                {item.points}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function ViewModeButton({ active, children, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`rounded-full px-7 py-4 text-xs font-black uppercase tracking-[0.2em] transition md:px-10 md:text-sm ${
        active
          ? 'bg-yellow-400 text-black shadow-[0_0_40px_rgba(250,204,21,0.45)]'
          : 'border-2 border-white/20 bg-white/10 text-white hover:border-yellow-400/50 hover:bg-white/15'
      }`}
    >
      {children}
    </motion.button>
  );
}

function StandingsSkeleton() {
  return (
    <div className="flex flex-col items-center gap-10 py-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-yellow-400/20 border-t-yellow-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">Loading live standings</p>
      </div>

      <div className="grid w-full grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, index) => {
          const isEvenPosition = (index + 1) % 2 === 0;
          return (
            <div key={index} className={isEvenPosition ? 'md:mt-10' : undefined}>
              <div className="flex overflow-hidden">
                <div className="h-[4.5rem] w-14 shrink-0 animate-pulse rounded-l-2xl bg-white/90 md:w-16" />
                <div className="h-[4.5rem] flex-1 animate-pulse rounded-r-2xl bg-white/10" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartingGridView({ items, mode, season }) {
  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-8 text-center">
        <h3 className="font-display text-3xl font-black uppercase italic leading-none tracking-[0.02em] text-white md:text-5xl">
          <span className="text-white">Championship </span>
          <span className="text-red-600">Grid</span>
        </h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.28em] text-zinc-400 md:text-sm">
          {`${season || '2026'} Driver Standings`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        {items.map((item, index) => {
          const isEvenPosition = item.position % 2 === 0;

          return (
            <div
              key={`${mode}-${item.position}-${item.name || item.team}`}
              className={isEvenPosition ? 'md:mt-10' : undefined}
            >
              <StartingGridCard
                position={item.position}
                name={item.name}
                subtitle={item.team}
                points={item.points}
                teamColorCode={item.teamColorCode}
                index={index}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function mapDriverStandings(rawList) {
  return (rawList ?? []).map((entry) => {
    const constructor = entry.Constructors?.[0];
    return {
      position: Number(entry.position),
      name: `${entry.Driver.givenName} ${entry.Driver.familyName}`,
      team: constructor?.name ?? '',
      points: entry.points,
      teamColorCode: getTeamColor(constructor?.constructorId),
    };
  });
}

function mapConstructorStandings(rawList) {
  return (rawList ?? []).map((entry) => {
    const constructorId = entry.Constructor.constructorId;
    const meta = getConstructorMeta(constructorId);
    return {
      position: Number(entry.position),
      constructorId,
      team: meta?.name ?? entry.Constructor.name,
      points: entry.points,
      teamColorCode: getTeamColor(constructorId),
      logoUrl: meta?.logoUrl ?? null,
      invertLogo: meta?.invertLogo ?? true,
    };
  });
}

export default function Standing() {
  const [viewMode, setViewMode] = useState('drivers');
  const [driverStandings, setDriverStandings] = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [seasonMeta, setSeasonMeta] = useState({ season: '', round: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStandings() {
      setIsLoading(true);
      setError(null);

      try {
        const [driversRes, constructorsRes] = await Promise.all([
          fetch(DRIVER_STANDINGS_URL, { signal: controller.signal }),
          fetch(CONSTRUCTOR_STANDINGS_URL, { signal: controller.signal }),
        ]);

        if (!driversRes.ok || !constructorsRes.ok) {
          throw new Error('Failed to load championship standings.');
        }

        const [driversJson, constructorsJson] = await Promise.all([
          driversRes.json(),
          constructorsRes.json(),
        ]);

        const driverList = driversJson.MRData.StandingsTable.StandingsLists[0];
        const constructorList = constructorsJson.MRData.StandingsTable.StandingsLists[0];

        setDriverStandings(mapDriverStandings(driverList?.DriverStandings));
        setConstructorStandings(mapConstructorStandings(constructorList?.ConstructorStandings));
        setSeasonMeta({
          season: driverList?.season || constructorList?.season || '',
          round: driverList?.round || constructorList?.round || '',
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Unable to fetch live standings.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchStandings();
    return () => controller.abort();
  }, []);

  const lastUpdated =
    seasonMeta.season && seasonMeta.round
      ? `Live from Ergast · Season ${seasonMeta.season} · Round ${seasonMeta.round}`
      : 'Live championship data from Jolpi / Ergast';

  return (
    <section id="standing" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.08),transparent_35%),radial-gradient(circle_at_30%_20%,rgba(250,204,21,0.05),transparent_40%)]" />

      <div className="relative mx-auto max-w-5xl px-5 md:px-8">
        <Reveal>
          <SectionHeading eyebrow="Championship" title="Standing" description={standingsIntro} />
          <p className="-mt-8 mb-10 text-center text-xs font-semibold uppercase tracking-[0.22em] text-yellow-300/80">
            {lastUpdated}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mb-10 flex flex-wrap justify-center gap-4">
            <ViewModeButton active={viewMode === 'drivers'} onClick={() => setViewMode('drivers')}>
              Driver Standings
            </ViewModeButton>
            <ViewModeButton active={viewMode === 'constructors'} onClick={() => setViewMode('constructors')}>
              Constructor Standings
            </ViewModeButton>
          </div>
        </Reveal>

        <div className="rounded-[2rem] border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:p-8">
          {isLoading ? (
            <StandingsSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-2xl font-black uppercase tracking-wide text-white">Signal Lost</p>
              <p className="max-w-md text-sm text-zinc-400">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-yellow-300 transition hover:bg-yellow-400/20"
              >
                Retry
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'drivers' ? (
                <StartingGridView items={driverStandings} mode="drivers" season={seasonMeta.season} />
              ) : (
                <ConstructorStandingsTable items={constructorStandings} season={seasonMeta.season} />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
