import { useEffect, useState } from 'react';
import { decorateEpisodes, fallbackEpisodes } from '../data/episodes';

/**
 * Loads live episodes from /api/episodes, seeded with the static snapshot so
 * real content renders immediately and survives the API being down.
 */
export default function useEpisodes() {
  const [state, setState] = useState(() => ({
    episodes: decorateEpisodes(fallbackEpisodes),
    source: 'fallback',
    isLoading: true,
  }));

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/episodes', { signal: controller.signal });
        if (!res.ok) throw new Error(`episodes API responded ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.episodes) || !data.episodes.length) {
          throw new Error('episodes API returned no episodes');
        }
        setState({
          episodes: decorateEpisodes(data.episodes),
          source: data.source ?? 'api',
          isLoading: false,
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    })();

    return () => controller.abort();
  }, []);

  return state;
}
