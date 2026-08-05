import { useState } from 'react';
import { motion } from 'framer-motion';
import { driversData } from '../data/drivers';
import { getDriverInitials } from '../data/driverAvatars';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

const TEAM_COLORS = {
  Mercedes: '#27F4D2',
  Ferrari: '#E80020',
  McLaren: '#FF8000',
  'Red Bull Racing': '#3671C6',
  'Racing Bulls': '#6692FF',
  'Red Bull / RB': '#6692FF',
  Alpine: '#0093CC',
  Haas: '#B6BABD',
  Williams: '#005AFF',
  'Audi / Sauber': '#52E252',
  'Aston Martin': '#006F62',
  Cadillac: '#C4A052',
};

function getTeamColor(team) {
  return TEAM_COLORS[team] ?? '#FACC15';
}

function DriverAvatar({ driver, teamColor }) {
  const [failed, setFailed] = useState(false);
  const initials = getDriverInitials(driver.name);

  if (!driver.avatarUrl || failed) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#1a1a1a]">
        <span
          className="font-display text-4xl font-black tracking-wider text-white/25"
          style={{ textShadow: `0 0 40px ${teamColor}55` }}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <motion.img
      src={driver.avatarUrl}
      alt={driver.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="aspect-[4/5] w-full object-cover object-top transition-all duration-300 hover:scale-105"
      style={{
        filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.12))',
      }}
      onError={() => setFailed(true)}
    />
  );
}

function DriverCard({ driver, index }) {
  const teamColor = getTeamColor(driver.team);

  return (
    <Reveal delay={(index % 4) * 0.06}>
      <motion.article
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111111] shadow-[0_0_0_1px_rgba(250,204,21,0)] transition hover:border-yellow-400/35 hover:shadow-[0_0_32px_rgba(250,204,21,0.12)]"
      >
        <div className="relative overflow-hidden">
          <DriverAvatar driver={driver} teamColor={teamColor} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#111111] to-transparent" />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-80"
            style={{ backgroundColor: teamColor }}
          />
        </div>

        <div className="p-5 md:p-6">
          <h3 className="font-display text-xl font-black uppercase tracking-wide text-white md:text-2xl">
            {driver.name}
          </h3>
          <p
            className="mt-2 text-xs font-bold uppercase tracking-[0.22em]"
            style={{ color: teamColor }}
          >
            {driver.team}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{driver.bio}</p>
        </div>
      </motion.article>
    </Reveal>
  );
}

export default function Drivers() {
  return (
    <section id="drivers" className="relative min-h-screen py-28 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.07),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(220,38,38,0.06),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="2026 Grid"
          title="All 22 Drivers"
          description="Meet the full Formula 1 driver line-up — pace, personality, and the stories behind every seat on the 2026 grid."
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {driversData.map((driver, index) => (
            <DriverCard key={driver.id} driver={driver} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
