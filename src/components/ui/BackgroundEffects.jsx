import { motion } from 'framer-motion';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6';

const iconMap = {
  youtube: FaYoutube,
  tiktok: FaTiktok,
  facebook: FaFacebook,
  instagram: FaInstagram,
};

export function SocialIcon({ id, className = 'h-5 w-5' }) {
  const Icon = iconMap[id];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden="true" />;
}

// Faint film grain as a self-contained SVG data URI. Non-repeating to the eye,
// so it adds texture without the tiled look of the old checkerboard.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-carbon">
      {/* Deep graded base with soft brand glows: warm yellow up top, a faint
          red ember low-left. Gives depth without any visible pattern. */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,rgba(255,212,0,0.10),transparent_60%),radial-gradient(70%_50%_at_15%_110%,rgba(225,6,0,0.06),transparent_60%),linear-gradient(180deg,#0b0b0d_0%,#08080a_50%,#050506_100%)]" />

      {/* One slow, soft glow for a little life — no scanning lines. */}
      <motion.div
        className="absolute -right-32 top-16 h-80 w-80 rounded-full bg-yellow-400/[0.07] blur-3xl"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Fine grain for premium texture — replaces the checkerboard. */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      {/* Vignette: darkens the edges so content sits in a pool of light. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
