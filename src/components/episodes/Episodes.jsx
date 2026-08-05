import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FaArrowUpRightFromSquare, FaYoutube } from 'react-icons/fa6';
import { CHANNEL } from '../../data/episodes';
import useEpisodes from '../../hooks/useEpisodes';
import GlowButton from '../ui/GlowButton';
import Reveal from '../ui/Reveal';
import SectionHeading from '../ui/SectionHeading';
import CategoryChips from './CategoryChips';
import EpisodeCard from './EpisodeCard';
import EpisodeLightbox from './EpisodeLightbox';

const COLLAPSED_COUNT = 8;

export default function Episodes() {
  const { episodes } = useEpisodes();
  const [category, setCategory] = useState('all');
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const filtered = category === 'all' ? episodes : episodes.filter((episode) => episode.category === category);
  const [featured, ...rest] = filtered;
  const visible = showAll ? rest : rest.slice(0, COLLAPSED_COUNT);

  return (
    <section id="episodes" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.08),transparent_45%)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="Episodes"
          title="Latest From The Paddock"
          description="Race reviews, previews, and F1 explained — in Sinhala, every race weekend. Straight from the Yellow Flag YouTube channel."
        />

        <Reveal>
          <CategoryChips
            active={category}
            onChange={(next) => {
              setCategory(next);
              setShowAll(false);
            }}
          />
        </Reveal>

        {featured ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Reveal className="md:col-span-2 lg:row-span-2">
              <EpisodeCard episode={featured} onPlay={setActiveEpisode} featured />
            </Reveal>
            {visible.map((episode, index) => (
              <Reveal key={episode.videoId} delay={Math.min(index * 0.06, 0.3)}>
                <EpisodeCard episode={episode} onPlay={setActiveEpisode} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-400">No episodes in this category yet — new ones drop every race weekend.</p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {rest.length > COLLAPSED_COUNT && (
            <GlowButton
              type="button"
              variant="secondary"
              onClick={() => setShowAll((prev) => !prev)}
              aria-expanded={showAll}
            >
              {showAll ? 'Show Fewer Episodes' : `Show All ${filtered.length} Episodes`}
            </GlowButton>
          )}
          <GlowButton href={CHANNEL.subscribeUrl} target="_blank" rel="noopener noreferrer" variant="youtube">
            <FaYoutube className="h-4 w-4" />
            Subscribe on YouTube
          </GlowButton>
          <a
            href={CHANNEL.videosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400 transition hover:text-yellow-300"
          >
            All episodes on YouTube
            <FaArrowUpRightFromSquare className="h-3 w-3" />
          </a>
        </div>
      </div>

      <AnimatePresence>
        {activeEpisode && <EpisodeLightbox episode={activeEpisode} onClose={() => setActiveEpisode(null)} />}
      </AnimatePresence>
    </section>
  );
}
