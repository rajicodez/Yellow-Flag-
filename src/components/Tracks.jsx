import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaArrowRight, FaXmark } from 'react-icons/fa6';
import { f1Tracks2026, tracksIntro } from '../data/tracks';
import ExpandableGrid from './ui/ExpandableGrid';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

/**
 * Track outline confined to a stage on the right of the card, so it never
 * crosses the title or the round pill. Fills its parent box via object-contain
 * for a consistent size across circuits, with a soft yellow glow.
 */
function TrackOutline({ track }) {
  const [failed, setFailed] = useState(false);
  const shouldInvert = Boolean(track.invertLayout);

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-[48%] overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_50%,rgba(250,204,21,0.12),transparent_68%)]" />

      {track.layoutPath && (
        <svg
          viewBox={track.viewBox || '-6 -6 237 267'}
          className="absolute inset-0 m-auto h-[70%] w-[80%] opacity-80"
          style={{
            filter: `${shouldInvert ? 'invert(1) ' : ''}drop-shadow(0 0 7px rgba(250,204,21,0.3)) drop-shadow(0 0 18px rgba(250,204,21,0.12))`,
          }}
          fill="none"
          aria-hidden="true"
        >
          <path
            d={track.layoutPath}
            stroke="#FACC15"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
        </svg>
      )}

      {track.layoutUrl && !failed && (
        <motion.img
          src={track.layoutUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 m-auto h-[64%] w-[74%] object-contain opacity-55"
          style={{
            filter: `${shouldInvert ? 'invert(1) ' : ''}drop-shadow(0 0 6px rgba(250,204,21,0.28)) drop-shadow(0 0 16px rgba(250,204,21,0.1))`,
          }}
          whileHover={{ scale: 1.04, opacity: 0.85 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function TrackStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-yellow-500">{label}</p>
      <p className="mt-1.5 text-base font-semibold leading-snug text-white">{value}</p>
    </div>
  );
}

function TrackModal({ track, onClose }) {
  const shouldInvert = Boolean(track.invertLayout);

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
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111]/90 p-6 shadow-2xl backdrop-blur-xl md:p-8"
        style={{ borderTopColor: 'rgba(250,204,21,0.7)', borderTopWidth: '3px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close track details"
          className="absolute right-4 top-4 z-10 text-gray-400 transition-colors hover:text-white"
        >
          <FaXmark className="h-5 w-5" />
        </button>

        {/* Track layout */}
        {track.layoutPath ? (
          <div className="flex items-center justify-center pb-2 pt-4">
            <svg
              viewBox={track.viewBox || "-6 -6 237 267"}
              className={`h-44 w-full max-w-md drop-shadow-[0_0_18px_rgba(250,204,21,0.25)] md:h-52 ${
                shouldInvert ? 'invert brightness-200' : 'brightness-200'
              }`}
              fill="none"
            >
              <path
                d={track.layoutPath}
                stroke="#FACC15"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                fill="none"
              />
            </svg>
          </div>
        ) : track.layoutUrl ? (
          <div className="flex items-center justify-center pb-2 pt-4">
            <img
              src={track.layoutUrl}
              alt={`${track.name} layout`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`h-44 w-full max-w-md object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.25)] md:h-52 ${
                shouldInvert ? 'invert brightness-200' : 'brightness-200'
              }`}
            />
          </div>
        ) : null}

        {/* Header */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-300">
            Round {String(track.id).padStart(2, '0')} · 2026 Calendar
          </p>
          <h3 className="mt-2 font-display text-2xl font-extrabold uppercase leading-tight text-white md:text-3xl">
            {track.name}
          </h3>
        </div>

        {/* Description */}
        <p className="mt-6 text-sm leading-7 text-gray-300 md:text-base">{track.description}</p>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          <TrackStat label="Country" value={track.country} />
          <TrackStat label="Track Length" value={track.trackLength} />
          <TrackStat label="Laps" value={track.laps} />
          <TrackStat label="Corners" value={track.corners} />
          <TrackStat label="Race Distance" value={track.raceDistance} />
          <TrackStat label="Track Type" value={track.trackType} />
          <TrackStat label="Time of Day" value={track.timeOfDay} />
          <TrackStat label="Lap Record" value={track.lapRecord} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function TrackCard({ track, index, onSelect }) {
  return (
    <Reveal delay={index * 0.04}>
      <motion.article
        id={`track-${track.id}`}
        whileHover={{ y: -6 }}
        onClick={() => onSelect(track)}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#151515] to-[#0a0a0a] transition hover:border-yellow-400/30 hover:shadow-[0_0_36px_rgba(250,204,21,0.12)]"
      >
        <div className="relative flex min-h-[220px] flex-1 flex-col overflow-hidden p-5 md:min-h-[240px] md:p-6">
          <TrackOutline track={track} />

          <span className="relative z-10 inline-flex w-fit rounded-full border border-yellow-400/40 bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-300 backdrop-blur-sm">
            Round {String(track.id).padStart(2, '0')}
          </span>

          <div className="relative z-10 mt-auto max-w-[52%] pt-8">
            <h3 className="font-display text-xl font-extrabold uppercase leading-tight tracking-wide text-white md:text-2xl">
              {track.name}
            </h3>
            <p className="mt-2 text-sm text-gray-400">{track.country}</p>
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
              onSelect(track);
            }}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-[#1a1a1a] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:border-yellow-400/35 hover:text-yellow-200 group-hover:border-yellow-400/35 group-hover:text-yellow-200"
          >
            Click for Circuit Details
            <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </motion.article>
    </Reveal>
  );
}

export default function Tracks() {
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Lock page scroll and allow Escape to close while the modal is open.
  useEffect(() => {
    if (!selectedTrack) return undefined;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedTrack(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedTrack]);

  return (
    <section id="tracks" className="relative py-24 md:py-32">
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading eyebrow="Tracks" title="F1 Tracks" description={tracksIntro} />

        <ExpandableGrid expandLabel="VIEW ALL TRACKS" collapseLabel="See Less" collapsedMaxHeight="max-h-[640px]">
          {f1Tracks2026.map((track, index) => (
            <TrackCard key={track.id} track={track} index={index} onSelect={setSelectedTrack} />
          ))}
        </ExpandableGrid>

        <AnimatePresence>
          {selectedTrack && <TrackModal track={selectedTrack} onClose={() => setSelectedTrack(null)} />}
        </AnimatePresence>
      </div>
    </section>
  );
}
