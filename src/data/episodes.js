/**
 * Yellow Flag YouTube channel + episode helpers.
 *
 * Live data comes from GET /api/episodes (see server/episodes.js). The
 * fallbackEpisodes list below is a real snapshot of the channel so the site
 * still shows genuine episodes when the API is unreachable (e.g. static
 * hosting without the Express server). Refresh it occasionally.
 */

export const CHANNEL = {
  handle: '@YellowFlagpod',
  id: 'UCbEupuDLd59IJYvbwf8vgxA',
  url: 'https://www.youtube.com/@YellowFlagpod',
  videosUrl: 'https://www.youtube.com/@YellowFlagpod/videos',
  subscribeUrl: 'https://www.youtube.com/@YellowFlagpod?sub_confirmation=1',
};

/**
 * Episode categories, styled after tyre compounds. `color` is the compound
 * ring/badge colour.
 */
export const episodeCategories = [
  { id: 'review', label: 'Race Reviews', compound: 'Soft', color: '#E10600' },
  { id: 'preview', label: 'Previews & Predictions', compound: 'Medium', color: '#FFD400' },
  { id: 'explainer', label: 'F1 Explained', compound: 'Hard', color: '#F0F0F0' },
  { id: 'paddock', label: 'Paddock Talk', compound: 'Inter', color: '#39B54A' },
];

const categoryById = Object.fromEntries(episodeCategories.map((category) => [category.id, category]));

export function getCategory(id) {
  return categoryById[id] ?? categoryById.paddock;
}

/** Heuristic tagging from the episode title; order matters. */
export function categorizeEpisode(title) {
  if (/race review|gp review/i.test(title)) return 'review';
  if (/explained/i.test(title)) return 'explainer';
  if (/prediction|preview|facts|දිනයිද|can .{0,24} win/i.test(title)) return 'preview';
  return 'paddock';
}

export function watchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function embedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}

/**
 * hqdefault always exists (4:3 with letterbox bars — crop with a 16:9 box +
 * object-cover); maxresdefault is sharper but 404s on some videos, so pair it
 * with an onError fallback to hqdefault.
 */
export function thumbnailUrl(videoId, quality = 'hq') {
  return `https://i.ytimg.com/vi/${videoId}/${quality === 'max' ? 'maxresdefault' : 'hqdefault'}.jpg`;
}

/** Attach category + URLs to raw episodes from the API or the fallback list. */
export function decorateEpisodes(rawEpisodes) {
  return rawEpisodes.map((episode) => ({
    publishedAt: null,
    publishedText: null,
    views: null,
    viewsText: null,
    duration: null,
    ...episode,
    category: categorizeEpisode(episode.title),
  }));
}

/** Real channel snapshot (newest first) — July 2026. */
export const fallbackEpisodes = [
  { videoId: 'ASFbrRbbbZ0', title: '2021 Abu Dhabi මතක් කරපු Silverstone! | British Grand Prix Race Review | Sinhala F1 Podcast' },
  { videoId: 'eZmuDFQF35E', title: 'George Strikes back | Austrian Grand Prix Race Review | Sinhala F1 Podcast' },
  { videoId: '_PO9FDNeSOA', title: 'Lewis නම් සුපිරියක් | Spanish Grand Prix Race Review | Sinhala F1 Podcast' },
  { videoId: 'rWCoUV_md_0', title: 'KIMI ට බුදුසරණයි CHARLES ට අඹ සරණයි | Monaco GP Race Review | Sinhala F1 Podcast' },
  { videoId: 'jR2ao3taxSc', title: 'Kimi මල්ලි පොර්ර්ර් උනා. George අයියා චෝර්ර්ර් උනා. | Canadian GP Race Review | Sinhala F1 Podcast' },
  { videoId: 'SRPk9tlaJps', title: '2026 Miami Grand Prix Race Review | Sinhala F1 Podcast' },
  { videoId: 'Az-Wj8-UrLo', title: 'මේ Redbull Downfall එකද ?? | Sinhala F1 Podcast' },
  { videoId: '_WvBUJHV_ZA', title: 'Championship ON? | 2026 Japanese GP Race Review | Sinhala F1 Podcast' },
  { videoId: '-px5sQCZCek', title: 'F1 Tyres Explained 🏎️🔥 | F1 Explained in Sinhala' },
  { videoId: 'gf4yhnH4n9c', title: 'Lewis is Back!! | 2026 Chinese GP Race Review | Sinhala F1 Podcast' },
  { videoId: '5KzeprQLUnE', title: 'F1 is Baaack!!! | 2026 Australian GP Race Review | Sinhala F1 Podcast' },
  { videoId: 'dPm9AJtcGY4', title: '2026 F1 Season එක ගැන දැනගන්නම ඕන FACTS!!! | Sinhala F1 Podcast' },
  { videoId: 'mrO1Wo-6xVE', title: 'Ferrari කැරකෙන Wing එක!! | 2026 F1 Testing Recap | F1 Sinhala Pocast' },
  { videoId: 'gecQBVq0RSw', title: 'Our Crazy Prediction for 2026 F1 Season | Sinhala F1 Podcast' },
  { videoId: 'aRgULDu3p_0', title: 'හොරෙන්ම TESTING 1...2...3...4...| F1 Shakedown | Sinhala F1 Podcast' },
  { videoId: 'x9yRGt6MNf0', title: 'Reacting to Mercedes, Ferrari, Haas, Audi and Alpine 2026 F1 Car Liveries | Sinhala F1 Podcast' },
  { videoId: 'jPtHp364Z9A', title: 'Reacting to Redbull and VCARB 2026 F1 Car Launch | Sinhala F1 Podcast' },
  { videoId: 'vPu87-Yuylk', title: 'The Greatest of All Time? | Story of Lewis Hamilton' },
  { videoId: 'lRNwvoWQcik', title: '2026 F1 cars වලට මොකද වෙන්නෙ? | F1 Explained in sinhala' },
  { videoId: '0kQwghg-_kA', title: 'Landooooo World Champion!!! | Abu Dhabi GP Race Review | Sinhala f1 podcast | EP06' },
  { videoId: 'Ux8Z3_TzL7s', title: 'Qatar GP 2025 Race Review | Sinhala F1 Podcast | EP 05' },
  { videoId: 'doDNuuBIkGI', title: 'Las Vegas Grand Prix 2025 Race Review | Sinhala F1 Podcast | EP 04' },
  { videoId: 'X82hNBQO7Tw', title: 'PARC FERMÉ කියන්නේ මොකක්ද ? | F1 Explained in sinhala' },
  { videoId: 'aUYdeM1xpfE', title: 'Brazil GP Race Review | EP 03' },
  { videoId: 'NPAzFzmLJMA', title: 'Max Verstappen දිනයිද? | Can Max still win the F1 2025 Championship?' },
  { videoId: 'R9uoJoVGlJM', title: 'මොකක්ද මේ Formula 1? 🏎️💨 | F1 Explained in Sinhala' },
  { videoId: 'NLsJe5qIBuU', title: 'Papaya Rules! සහ MAX ගේ WIN එක! Italian GP Race Review | EP 01' },
];
