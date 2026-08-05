import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaArrowUpRightFromSquare, FaXmark, FaYoutube } from 'react-icons/fa6';
import { CHANNEL, embedUrl, watchUrl } from '../../data/episodes';
import GlowButton from '../ui/GlowButton';

export default function EpisodeLightbox({ episode, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={episode.title}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0a0a] shadow-[0_0_80px_rgba(250,204,21,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h3 className="font-sinhala text-sm font-bold leading-snug text-white md:text-base">
            {episode.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            <FaXmark className="h-4 w-4" />
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl(episode.videoId)}
            title={episode.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <GlowButton
            href={CHANNEL.subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="youtube"
            className="px-5 py-3 text-xs"
          >
            <FaYoutube className="h-4 w-4" />
            Subscribe to Yellow Flag
          </GlowButton>
          <a
            href={watchUrl(episode.videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400 transition hover:text-yellow-300"
          >
            Watch on YouTube
            <FaArrowUpRightFromSquare className="h-3 w-3" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
