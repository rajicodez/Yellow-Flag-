export const BRAND = {
  name: 'Yellow Flag',
  tagline: 'Sinhala F1 Podcast for Real Racing Fans',
  description:
    'Race reviews, driver battles, team strategies, Grand Prix reactions, and Formula 1 stories — explained in Sinhala for Sri Lankan F1 fans.',
  footerTagline: 'Yellow Flag — Sinhala Formula 1 Podcast for Sri Lankan Racing Fans.',
};

export const studio = {
  name: 'Kindforth',
  url: 'https://kindforth.com',
};

export const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'about', label: 'About' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'teams', label: 'Teams' },
  { id: 'drivers', label: 'Drivers', path: '/drivers' },
  { id: 'standing', label: 'Standing' },
  { id: 'game', label: 'Game' },
  { id: 'contact', label: 'Contact' },
];

export const aboutIntro =
  'Yellow Flag is a Sinhala Formula 1 podcast created by two passionate F1 fans. Our goal is to bring the excitement of Formula 1 closer to Sri Lankan fans through race discussions, driver stories, team analysis, and fun motorsport conversations.';

export const hosts = [
  {
    id: 1,
    name: 'Lakindu',
    role: 'Engineering Enthusiast / Red Bull Fan',
    bio: [
      "Lakindu's F1 origin story is painfully unglamorous: back in 2019, he stumbled onto a race on TV completely by accident — and by the time the checkered flag dropped, he was hooked for life. No dramatic paddock moment, no childhood memory of Schumacher. Just a remote control and questionable channel-surfing that changed everything.",
      "That love only got more intense once he saw it in person — witnessing the Australian Grand Prix live left him properly fascinated by just how insanely fast these cars actually are. Onboard cameras don't even come close to doing it justice, apparently.",
      "Based in Melbourne, Lakindu brings an engineering brain to the chaos of Formula 1 — when he's not buried in stats and lap-time deltas, he's nerding out over the actual engineering behind the cars (his studies are in engineering, so blame that for the technical tangents). But don't worry, he balances the nerdy stuff with a healthy dose of banter, hot takes on driver dramas, and the occasional unfiltered reaction to a first-lap pile-up.",
      'A proud Red Bull Racing fan and self-appointed Max Verstappen defender-in-chief, Lakindu brings equal parts stats obsession, engineering curiosity, and cheeky commentary to every episode.',
    ],
    badge: 'P1',
    photo: '/hosts/lakindu.png',
    // Each host's personal accounts, not the podcast's.
    socials: [
      { id: 'facebook', url: 'https://www.facebook.com/lakinduvihan.siriwardana' },
      { id: 'instagram', url: 'https://www.instagram.com/lakindu_siriwardana/' },
    ],
  },
  {
    id: 2,
    name: 'Kasun',
    role: 'Engineering Enthusiast / Ferrari Fan',
    bio: [
      "Formula 1 has always been more than a sport to me—it's a blend of innovation, strategy, engineering, and human performance that never stops evolving. That passion is what inspired me to become one of the co-hosts of the Yellow Flag Podcast, where we bring thoughtful race analysis, technical insights, and engaging discussions to Formula 1 fans.",
      "At Yellow Flag Podcast, I believe the best conversations come from looking beyond the headlines. Every Grand Prix tells a deeper story, whether it's a bold strategic call, a technical breakthrough, or the defining moments that shape a championship. My goal is to explore those stories in a way that is insightful, balanced, and accessible to both dedicated followers and those who are just discovering the sport.",
      "As a proud Sri Lankan, I'm especially passionate about making Formula 1 more accessible to Sinhala-speaking audiences. By breaking down complex topics into clear and engaging discussions, I hope to help grow a community where fans can learn, share opinions, and enjoy the sport together.",
      "The Yellow Flag Podcast is built on curiosity, respectful debate, and a genuine appreciation for Formula 1. Whether we're analysing race weekends, discussing driver performances, or exploring the latest developments in the paddock, every episode is driven by a shared enthusiasm for the sport and a commitment to delivering meaningful conversations.",
      'Thank you for being part of our journey. We look forward to sharing every twist, triumph, and unforgettable moment of Formula 1 with you.',
    ],
    badge: 'P2',
    photo: '/hosts/kasun.jpg',
    socials: [
      { id: 'facebook', url: 'https://www.facebook.com/profile.php?id=100008727703507' },
      { id: 'instagram', url: 'https://www.instagram.com/kasun_udayangana/' },
    ],
  },
];

export const timelineItems = [
  { year: '01', title: 'Idea Started', text: 'Two F1 fans decide to create a Sinhala podcast for Sri Lankan racing lovers.' },
  { year: '02', title: 'First F1 Podcast Episode', text: 'The first episode goes live — race talk, reactions, and pure fan energy in Sinhala.' },
  { year: '03', title: 'Sinhala F1 Community Growth', text: 'More fans join every race weekend, building a real Sri Lankan F1 community.' },
  { year: '04', title: 'Race Review Series', text: 'Dedicated race review episodes become a fan-favorite format after every Grand Prix.' },
  { year: '05', title: 'Fan Discussions', text: 'Live-style discussions, Q&A energy, and community-driven F1 conversations expand.' },
  { year: '06', title: 'Future of Yellow Flag', text: 'Bigger episodes, stronger visuals, and deeper F1 coverage for every Sri Lankan fan.' },
];

export const highlightCards = [
  { title: 'Best Race Reactions', text: 'Raw Grand Prix reactions and honest post-race breakdowns in Sinhala.', accent: 'from-yellow-500/35 to-yellow-300/5' },
  { title: 'Driver Battle Discussions', text: 'Teammate wars, rivalries, and on-track drama explained clearly.', accent: 'from-white/15 to-yellow-400/10' },
  { title: 'Grand Prix Predictions', text: 'Bold previews, circuit analysis, and prediction episodes before lights out.', accent: 'from-yellow-400/25 to-transparent' },
  { title: 'Funny Podcast Moments', text: 'Entertaining banter, fan energy, and memorable podcast clips.', accent: 'from-zinc-500/20 to-yellow-500/10' },
];

export const socialLinks = [
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@yellowflagpod' },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@yellowflag_podcast' },
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/1C8GTTT12X/' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/yellowflag_pod' },
];

/** Lookup for places that reference a platform by id, e.g. each host's `socials`. */
export const socialUrlById = Object.fromEntries(socialLinks.map((social) => [social.id, social.url]));
