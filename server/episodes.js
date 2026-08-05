/**
 * Yellow Flag episode feed.
 *
 * Sources, in order of preference:
 *  1. YouTube RSS feed  — clean data (ISO dates, view counts) but YouTube
 *     sometimes refuses it from data-center IPs.
 *  2. Channel /videos page scrape — parses ytInitialData (lockupViewModel,
 *     the post-2024 YouTube markup) for id/title/views/age/duration.
 *
 * Results are cached in memory for 30 minutes; the client also ships a static
 * fallback list, so this endpoint failing never blanks the site.
 */

const CHANNEL_ID = 'UCbEupuDLd59IJYvbwf8vgxA';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const VIDEOS_URL = 'https://www.youtube.com/@YellowFlagpod/videos';
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept-Language': 'en-US,en;q=0.9',
};

let cache = { payload: null, fetchedAt: 0 };

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

async function fetchRssEpisodes() {
  const res = await fetch(RSS_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`RSS feed responded ${res.status}`);
  const xml = await res.text();

  const episodes = [];
  const entryBlocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  for (const block of entryBlocks) {
    const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = block.match(/<title>([^<]*)<\/title>/)?.[1];
    if (!videoId || !title) continue;
    const views = block.match(/<media:statistics views="(\d+)"/)?.[1];
    episodes.push({
      videoId,
      title: decodeXmlEntities(title),
      publishedAt: block.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
      publishedText: null,
      views: views ? Number(views) : null,
      viewsText: null,
      duration: null,
    });
  }
  if (!episodes.length) throw new Error('RSS feed contained no entries');
  return episodes;
}

/** Extract the balanced ytInitialData JSON object from a YouTube page. */
function extractInitialData(html) {
  const idx = html.indexOf('ytInitialData');
  if (idx === -1) throw new Error('ytInitialData not found');
  const start = html.indexOf('{', idx);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error('ytInitialData JSON never closed');
}

function parseLockup(lockup) {
  if (!lockup?.contentId || lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;

  const meta = lockup.metadata?.lockupMetadataViewModel;
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows ?? [];
  const parts = rows.flatMap((row) => (row.metadataParts ?? []).map((part) => part.text?.content ?? ''));

  let duration = null;
  for (const overlay of lockup.contentImage?.thumbnailViewModel?.overlays ?? []) {
    for (const badge of overlay.thumbnailBottomOverlayViewModel?.badges ?? []) {
      const text = badge.thumbnailBadgeViewModel?.text;
      if (text && /^[\d:.]+$/.test(text)) duration = text.replace(/\./g, ':');
    }
  }

  return {
    videoId: lockup.contentId,
    title: meta?.title?.content ?? '',
    publishedAt: null,
    publishedText: parts[1] ?? null,
    views: null,
    viewsText: parts[0] ?? null,
    duration,
  };
}

async function scrapeVideosTab() {
  const res = await fetch(VIDEOS_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Videos page responded ${res.status}`);
  const data = extractInitialData(await res.text());

  const episodes = [];
  const seen = new Set();
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.lockupViewModel) {
      const episode = parseLockup(node.lockupViewModel);
      if (episode && !seen.has(episode.videoId)) {
        seen.add(episode.videoId);
        episodes.push(episode);
      }
    }
    for (const value of Object.values(node)) walk(value);
  })(data);

  if (!episodes.length) throw new Error('No videos found in ytInitialData');
  return episodes;
}

export async function getEpisodes() {
  if (cache.payload && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.payload;
  }

  let payload;
  try {
    payload = { episodes: await fetchRssEpisodes(), source: 'rss' };
  } catch (rssError) {
    console.warn('[episodes] RSS failed, scraping videos tab:', rssError.message);
    payload = { episodes: await scrapeVideosTab(), source: 'scrape' };
  }

  payload.fetchedAt = new Date().toISOString();
  cache = { payload, fetchedAt: Date.now() };
  return payload;
}
