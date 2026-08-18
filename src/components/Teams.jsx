import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaArrowRight, FaXmark } from 'react-icons/fa6';
import { getDriverAvatar } from '../data/driverAvatars';
import { f1Teams2026, teamsIntro } from '../data/teams';
import ExpandableGrid from './ui/ExpandableGrid';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

const driverImages = import.meta.glob('../assets/drivers/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

const driverImageSlugs = {
  'Lando Norris': 'lando-norris',
  'Oscar Piastri': 'oscar-piastri',
  'George Russell': 'george-russell',
  'Kimi Antonelli': 'kimi-antonelli',
  'Lewis Hamilton': 'lewis-hamilton',
  'Charles Leclerc': 'charles-leclerc',
  'Max Verstappen': 'max-verstappen',
  'Isack Hadjar': 'isack-hadjar',
  'Carlos Sainz': 'carlos-sainz',
  'Alex Albon': 'alexander-albon',
  'Liam Lawson': 'liam-lawson',
  'Arvid Lindblad': 'arvid-lindblad',
  'Fernando Alonso': 'fernando-alonso',
  'Lance Stroll': 'lance-stroll',
  'Esteban Ocon': 'esteban-ocon',
  'Ollie Bearman': 'oliver-bearman',
  'Pierre Gasly': 'pierre-gasly',
  'Franco Colapinto': 'franco-colapinto',
  'Nico Hulkenberg': 'nico-hulkenberg',
  'Gabriel Bortoleto': 'gabriel-bortoleto',
  'Valtteri Bottas': 'valtteri-bottas',
  'Sergio Perez': 'sergio-perez',
};

function getDriverImage(driverName) {
  const slug = driverImageSlugs[driverName];
  if (slug) {
    const match = Object.entries(driverImages).find(([path]) => path.includes(`/${slug}.`));
    if (match) return match[1];
  }
  // Fall back to official F1 media portraits (covers Albon, Hulkenberg, Perez, etc.).
  return getDriverAvatar(driverName);
}

function TeamLogo({ team }) {
  const [failed, setFailed] = useState(false);
  const shouldInvert = Boolean(team.invertLogo);
  const initials = team.name
    .split(' ')
    .filter((word) => word.length > 2)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (!team.logoUrl || failed) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 md:h-16 md:w-16">
        <span className="font-display text-xs font-black tracking-wider text-white/35 md:text-sm">{initials}</span>
      </div>
    );
  }

  return (
    <motion.img
      src={team.logoUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`pointer-events-none h-12 w-12 object-contain opacity-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] md:h-16 md:w-16 ${
        shouldInvert ? 'invert brightness-200' : ''
      }`}
      whileHover={{ scale: 1.06 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onError={() => setFailed(true)}
    />
  );
}

function DriverAvatar({ driverName, teamColor }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = getDriverImage(driverName);
  const initials = driverName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (imageSrc && !failed) {
    return (
      <img
        src={imageSrc}
        alt={driverName}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-16 w-16 shrink-0 rounded-xl object-cover object-top ring-2 ring-white/10"
        style={{ boxShadow: `0 0 20px ${teamColor}33` }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border bg-black/40"
      style={{ borderColor: `${teamColor}44` }}
    >
      <span className="font-display text-sm font-black text-white">{initials}</span>
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500">Soon</span>
    </div>
  );
}

function DriverCard({ driverName, teamColor }) {
  const imageSrc = getDriverImage(driverName);

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-4"
      style={{ boxShadow: `inset 3px 0 0 ${teamColor}` }}
    >
      <DriverAvatar driverName={driverName} teamColor={teamColor} />
      <div className="min-w-0 flex-1">
        <span className="inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-yellow-200">
          Main Driver
        </span>
        <p className="mt-1.5 truncate font-display text-base font-black uppercase tracking-[0.03em] text-white">{driverName}</p>
        {!imageSrc && (
          <p className="mt-1 text-[10px] font-semibold text-zinc-500">Driver Image Coming Soon</p>
        )}
      </div>
    </motion.div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-4">
      <p className="text-xs uppercase tracking-wider text-yellow-500">{label}</p>
      <p className="mt-1.5 text-base font-semibold leading-snug text-white">{value}</p>
    </div>
  );
}

function TeamModal({ team, onClose }) {
  const teamColor = team.color ?? '#FACC15';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111]/90 p-6 shadow-2xl backdrop-blur-xl md:p-8"
        style={{ borderTopColor: teamColor, borderTopWidth: '3px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close team details"
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white"
        >
          <FaXmark className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-5 pr-10">
          <TeamLogo team={team} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-300">2026 Grid</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold uppercase leading-tight text-white md:text-3xl">
              {team.name}
            </h3>
            <p className="mt-1 text-sm text-gray-400">{team.engine}</p>
          </div>
        </div>

        {/* Description */}
        <p className="mt-6 text-sm leading-7 text-gray-300 md:text-base">{team.description}</p>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <StatBlock label="Country / Base" value={team.country} />
          <StatBlock label="Constructors' Championships" value={team.championships} />
          <StatBlock label="Team Principal" value={team.teamPrincipal} />
          <StatBlock label="Owner" value={team.owner} />
          <StatBlock label="Main Sponsor" value={team.mainSponsor} />
          <StatBlock label="Power Unit" value={team.engine} />
        </div>

        {/* Driver lineup */}
        <p className="mb-3 mt-8 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-400">
          2026 Driver Lineup
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {team.drivers.map((driverName) => (
            <DriverCard key={driverName} driverName={driverName} teamColor={teamColor} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TeamCard({ team, index, onSelect }) {
  return (
    <Reveal delay={index * 0.06}>
      <motion.article
        id={`team-${team.id}`}
        layout
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => onSelect(team)}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] transition hover:border-yellow-400/30 hover:shadow-[0_0_36px_rgba(250,204,21,0.12)]"
      >
        <div className="relative flex-1 overflow-hidden px-5 pb-5 pt-5 text-left md:px-6 md:pt-6">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <span className="inline-flex rounded-full border border-yellow-400/40 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-300">
              2026 Grid
            </span>
            <TeamLogo team={team} />
          </div>

          <div className="relative z-10 mt-8 max-w-[95%]">
            <h3 className="font-display text-xl font-extrabold uppercase leading-tight tracking-wide text-white md:text-2xl">
              {team.name}
            </h3>
            <p className="mt-2 text-sm text-gray-400">{team.engine}</p>
          </div>
        </div>

        {/*
          The whole card opens the modal, but this stays a real button so the
          card is reachable by keyboard and announces what it does. It carries
          the "click for details" cue on its own, so the body no longer repeats it.
        */}
        <div className="border-t border-white/5 bg-[#111111] p-4 md:p-5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(team);
            }}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-[#1a1a1a] py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:border-yellow-400/30 hover:bg-zinc-900 hover:text-yellow-300 group-hover:border-yellow-400/30 group-hover:text-yellow-300"
          >
            Click for Team Details
            <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </motion.article>
    </Reveal>
  );
}

export default function Teams() {
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Lock page scroll and allow Escape to close while the modal is open.
  useEffect(() => {
    if (!selectedTeam) return undefined;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedTeam(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedTeam]);

  return (
    <section id="teams" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(250,204,21,0.05),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading eyebrow="Teams" title="F1 Teams" description={teamsIntro} />

        <ExpandableGrid expandLabel="See More" collapseLabel="See Less" collapsedMaxHeight="max-h-[720px]">
          {f1Teams2026.map((team, index) => (
            <TeamCard key={team.id} team={team} index={index} onSelect={setSelectedTeam} />
          ))}
        </ExpandableGrid>

        <AnimatePresence>
          {selectedTeam && <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />}
        </AnimatePresence>
      </div>
    </section>
  );
}
