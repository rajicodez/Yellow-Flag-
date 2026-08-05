import { FaPlay } from 'react-icons/fa6';
import { getCategory, thumbnailUrl } from '../../data/episodes';

function relativeTime(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

function formatViews(views) {
  return `${Intl.NumberFormat('en', { notation: 'compact' }).format(views)} views`;
}

export function isNewEpisode(episode) {
  if (episode.publishedAt) {
    return Date.now() - new Date(episode.publishedAt).getTime() < 14 * 86_400_000;
  }
  const match = episode.publishedText?.match(/(\d+)\s*(hour|day)/i);
  if (!match) return false;
  return match[2].toLowerCase() === 'hour' || Number(match[1]) <= 14;
}

function metaParts(episode) {
  const views = episode.views != null ? formatViews(episode.views) : episode.viewsText;
  const published = episode.publishedAt ? relativeTime(episode.publishedAt) : episode.publishedText;
  return [published, views].filter(Boolean);
}

export default function EpisodeCard({ episode, onPlay, featured = false }) {
  const category = getCategory(episode.category);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl transition hover:border-yellow-400/40 hover:shadow-[0_0_40px_rgba(250,204,21,0.18)]">
      <span
        className="absolute inset-x-0 top-0 z-10 h-1"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => onPlay(episode)}
        className="relative block aspect-video w-full overflow-hidden text-left"
        aria-label={`Play episode: ${episode.title}`}
      >
        <img
          src={thumbnailUrl(episode.videoId, featured ? 'max' : 'hq')}
          alt=""
          loading={featured ? 'eager' : 'lazy'}
          onError={(event) => {
            if (event.currentTarget.dataset.fallback) return;
            event.currentTarget.dataset.fallback = '1';
            event.currentTarget.src = thumbnailUrl(episode.videoId, 'hq');
          }}
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-sm bg-black/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-chequer">
          <span
            className="h-2.5 w-2.5 rounded-full border-[2.5px]"
            style={{ borderColor: category.color }}
            aria-hidden="true"
          />
          {category.label}
        </span>

        {isNewEpisode(episode) && (
          <span className="absolute right-4 top-4 rounded-sm bg-flag px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
            New
          </span>
        )}

        {episode.duration && (
          <span className="absolute bottom-3 right-3 rounded-sm bg-black/85 px-2 py-1 font-display text-xs font-bold tabular-nums text-chequer">
            {episode.duration}
          </span>
        )}

        <span
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-flag text-black opacity-0 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <FaPlay className="ml-0.5 h-5 w-5" />
        </span>
      </button>

      <div className={`flex flex-1 flex-col border-t border-white/10 p-5 ${featured ? 'md:p-6' : ''}`}>
        <h3
          className={`font-sinhala font-bold leading-snug text-chequer ${
            featured ? 'text-xl md:text-2xl' : 'line-clamp-2 text-base'
          }`}
        >
          {episode.title}
        </h3>
        {metaParts(episode).length > 0 && (
          <p className="mt-auto pt-3 text-xs font-semibold uppercase tracking-[0.16em] text-steel">
            {metaParts(episode).join(' · ')}
          </p>
        )}
      </div>
    </article>
  );
}
