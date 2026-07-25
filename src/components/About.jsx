import { useState } from 'react';
import { motion } from 'framer-motion';
import { aboutIntro, hosts } from '../data/content';
import { SocialIcon } from './ui/BackgroundEffects';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';


function HostCard({ host }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const paragraphs = Array.isArray(host.bio) ? host.bio : [host.bio];
  const visibleParagraphs = isExpanded ? paragraphs : paragraphs.slice(0, 1);
  const hasMore = paragraphs.length > 1;

  return (
    <motion.article
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl md:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
        <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-zinc-800 to-black">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(250,204,21,0.15),transparent)]" />
          <div className="flex h-full items-center justify-center font-display text-4xl font-black text-yellow-300/70">
            {host.badge}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-300">{host.role}</p>
          <h3 className="mt-2 font-display text-3xl font-black uppercase tracking-[0.03em] text-white">{host.name}</h3>
          <div className="mt-4 space-y-3 text-base leading-7 text-zinc-300">
            {visibleParagraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-2 inline-block cursor-pointer text-sm font-semibold text-yellow-500 transition-colors hover:text-yellow-400"
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </button>
          )}

          <div className="mt-6 flex gap-3">
            {host.socials.map((social) => (
              <a
                key={social}
                href="#"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300"
                aria-label={social}
              >
                <SocialIcon id={social} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function About() {
  return (
    <section id="about" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="About"
          title="Two Hosts. One Racing Mission."
          description={aboutIntro}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {hosts.map((host, index) => (
            <Reveal key={host.id} delay={index * 0.12}>
              <HostCard host={host} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
