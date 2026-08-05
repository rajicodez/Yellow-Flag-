import { motion } from 'framer-motion';
import { HiOutlineCalendarDays } from 'react-icons/hi2';
import { FaMapLocationDot } from 'react-icons/fa6';
import { f1Schedule2026, scheduleIntro } from '../data/schedule';
import ExpandableGrid from './ui/ExpandableGrid';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

function viewTrackHref(trackSlug) {
  if (!trackSlug) return '#tracks';
  return `#track-${trackSlug}`;
}

function ViewTrackButton({ href }) {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-[#4A4638] bg-[linear-gradient(90deg,#2A2820_0%,#2C2A21_45%,#302E26_100%)] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[#5C5748] hover:bg-[linear-gradient(90deg,#323028_0%,#353228_50%,#3A372E_100%)]"
    >
      <FaMapLocationDot className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" />
      View Track
    </motion.a>
  );
}

export default function Schedule() {
  return (
    <section id="schedule" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-10 bottom-20 h-24 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="Schedule"
          title="2026 F1 Schedule"
          description={scheduleIntro}
        />

        <ExpandableGrid expandLabel="See More" collapseLabel="See Less" collapsedMaxHeight="max-h-[700px]">
          {f1Schedule2026.map((race, index) => {
            const isSprintWeekend = Boolean(race.sprintDetails);

            return (
              <Reveal key={race.round} delay={index * 0.06} className="h-full">
                <motion.article
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -8, scale: 1.015 }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl transition hover:border-yellow-400/40 hover:shadow-[0_0_42px_rgba(250,204,21,0.16)]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(250,204,21,0.08),transparent_34%,transparent_60%,rgba(250,204,21,0.05))]" />
                  <div className="pointer-events-none absolute -right-14 top-10 h-28 w-28 rounded-full bg-yellow-400/10 blur-3xl transition duration-500 group-hover:bg-yellow-400/20" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-300">
                        Round {String(race.round).padStart(2, '0')}
                      </p>
                      <h3 className="mt-2 font-display text-xl font-black uppercase leading-tight tracking-[0.03em] text-white md:text-2xl">
                        {race.grandPrix}
                      </h3>
                    </div>
                    <motion.span
                      animate={isSprintWeekend ? { boxShadow: ['0 0 0 rgba(250,204,21,0.12)', '0 0 20px rgba(250,204,21,0.28)', '0 0 0 rgba(250,204,21,0.12)'] } : undefined}
                      transition={isSprintWeekend ? { duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' } : undefined}
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                        isSprintWeekend
                          ? 'border-yellow-400/45 bg-yellow-400/15 text-yellow-200'
                          : 'border-white/15 bg-white/5 text-zinc-200'
                      }`}
                    >
                      {isSprintWeekend ? 'Sprint Weekend' : 'Race Weekend'}
                    </motion.span>
                  </div>

                  {/*
                    Own full-width row rather than sharing the header row with the
                    badge: beside the badge the name only got ~180px, so the longer
                    circuits ("Autodromo Hermanos Rodriguez") wrapped to two lines.
                  */}
                  <p className="mb-5 flex items-center gap-2 text-sm text-zinc-300">
                    <FaMapLocationDot className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
                    <span>{race.track}</span>
                  </p>

                  <div className="rounded-[1.4rem] border border-yellow-400/20 bg-yellow-400/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/25 bg-black/25 text-yellow-300">
                        <HiOutlineCalendarDays className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">Race Time</p>
                        <p className="mt-2 text-lg font-black text-yellow-300 md:text-xl">{race.raceTime}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">Sri Lanka Time</p>
                      </div>
                    </div>
                  </div>

                  {race.sprintDetails && (
                    <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-300">Sprint Details</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-300">Sprint Qualifying</p>
                          <p className="mt-2 text-sm font-semibold text-zinc-100">{race.sprintDetails.sprintQualifying}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-300">Sprint</p>
                          <p className="mt-2 text-sm font-semibold text-zinc-100">{race.sprintDetails.sprint}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative mt-auto pt-6">
                    <ViewTrackButton href={viewTrackHref(race.trackSlug)} />
                  </div>
                </motion.article>
              </Reveal>
            );
          })}
        </ExpandableGrid>
      </div>
    </section>
  );
}
