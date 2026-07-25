import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa6';
import { BRAND } from '../data/content';
import GlowButton from './ui/GlowButton';

/**
 * Full-bleed background image. Sits behind the centered hero content. If the
 * photo fails to load, everything here fades out and the section's own
 * gradient background shows instead.
 *
 * The photo stays mounted rather than unmounting on failure: <picture> swaps
 * src when the viewport crosses the breakpoint (a phone rotating between
 * portrait and landscape), and that swap fires `error` on the img. Unmounting
 * there would kill the hero image for good, with no way back — so failure only
 * hides it, and a later successful load brings it straight back.
 *
 * This is the LCP element, so it loads eagerly at high priority — never lazy.
 */
function HeroBackdrop() {
  const [available, setAvailable] = useState(true);
  const fade = available ? '' : 'opacity-0';

  return (
    <div className={`absolute inset-0 overflow-hidden ${fade}`} aria-hidden="true">
      {/*
        Shifting the photo down (below) leaves a strip with no image behind the
        fixed navbar. Fill it with a heavily blurred copy of the photo's top
        edge, so the nav sits on soft stadium colour rather than a flat black
        band. Painted beneath the sharp photo, so only the strip ever shows.
        Same src, so it costs no extra request.
      */}
      <div className="absolute inset-x-0 top-0 hidden h-32 overflow-hidden md:block">
        <picture>
          <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.png" />
          <img
            src="/hero-bg.png"
            alt=""
            aria-hidden="true"
            className="h-64 w-full scale-125 object-cover object-top blur-3xl"
          />
        </picture>
      </div>

      {/*
        Two crops of the same scene. The landscape file puts the hosts at
        opposite edges of a 16:9 frame, so a portrait object-cover crop of it
        shows only the empty pit lane between them — hence a dedicated portrait
        file for mobile. <picture> means each viewport downloads one of them,
        never both.

        Mobile runs the photo at full width — never object-cover, which would
        crop the hosts' outer arms off — and positions it by their heads rather
        than by an edge. Their heads start 52.7% down the frame, which at full
        width is 93.64vw, so a top of calc(554px - 93.64vw) puts them at a
        constant 554px from the section top: always clear of the copy above,
        whatever the viewport height. Whatever hangs past the bottom is the
        lower suits, which the gradient darkens anyway. Desktop keeps the
        original object-cover treatment.

        Both feather their top edge into what's behind — 80px on mobile, where
        the frame is empty sky and can afford it; 30px on desktop, where the
        hosts' heads sit close to the top.
      */}
      <picture>
        <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.png" />
        <img
          className="absolute inset-x-0 top-[calc(554px-93.64vw)] w-full [mask-image:linear-gradient(to_bottom,transparent_0px,#000_80px)] md:static md:h-full md:translate-y-16 md:object-cover md:object-center md:[mask-image:linear-gradient(to_bottom,transparent_0px,#000_30px)]"
          src="/hero-bg.png"
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={() => setAvailable(true)}
          onError={() => setAvailable(false)}
        />
      </picture>
      {/*
        Dark washes keep the centered headline readable over the image.
        The vertical stops stay near-black only in the last few percent — just
        enough to blend into the black section below — then lift quickly so the
        hosts' suits don't get crushed at the bottom of the frame.
      */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.40)_16%,rgba(0,0,0,0.20)_55%,rgba(0,0,0,0.38)_100%)] md:block" />
      {/*
        Mobile equivalent, read bottom-up: near-black at the very bottom to meet
        the section below, then a bright window across 20–35% where the hosts'
        faces sit, then darkening again over the top half so the copy holds
        contrast against the sky.
      */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.45)_12%,rgba(0,0,0,0.18)_22%,rgba(0,0,0,0.16)_35%,rgba(0,0,0,0.34)_62%,rgba(0,0,0,0.46)_100%)] md:hidden" />
      {/*
        Centre scrim: darkens only the column the copy sits in, so the headline
        keeps its contrast while the hosts at either edge stay bright. Fades to
        fully transparent before it reaches them. Desktop only — on mobile the
        copy sits on black, so this would only add murk.
      */}
      <div className="absolute inset-0 hidden md:block bg-[radial-gradient(ellipse_35%_44%_at_50%_55%,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.665)_25%,rgba(0,0,0,0.635)_45%,rgba(0,0,0,0.59)_60%,rgba(0,0,0,0.52)_72%,rgba(0,0,0,0.40)_82%,rgba(0,0,0,0.26)_90%,rgba(0,0,0,0.12)_96%,rgba(0,0,0,0)_100%)]" />
    </div>
  );
}

export default function Hero() {
  // Mobile top-aligns the copy into the photo's empty sky; desktop centres it over the frame.
  // The mobile pt is deliberately past centre — it leaves 94px above the headline and 20px
  // between the buttons and the hosts' heads, so it can't grow much further without crowding them.
  return (
    <section id="home" className="relative flex min-h-screen items-start overflow-hidden pt-[136px] md:items-center md:pt-28">
      <HeroBackdrop />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.12),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.05),transparent_24%)]" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 text-center md:px-8">
        <div className="flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl font-black uppercase leading-[0.92] tracking-[0.02em] text-white md:text-7xl xl:text-8xl"
          >
            <span className="block text-yellow-300 drop-shadow-[0_0_30px_rgba(250,204,21,0.35)]">{BRAND.name}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 max-w-2xl text-xl font-semibold uppercase tracking-[0.12em] text-zinc-200 md:mt-5 md:text-2xl"
          >
            {BRAND.tagline}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:mt-6 md:text-lg md:leading-8"
          >
            {BRAND.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-8 flex flex-wrap justify-center gap-4 md:mt-10"
          >
            <GlowButton href="#episodes">
              <FaPlay className="h-4 w-4" />
              Watch Podcast
            </GlowButton>
            <GlowButton href="#episodes" variant="secondary">
              Explore Episodes
            </GlowButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
