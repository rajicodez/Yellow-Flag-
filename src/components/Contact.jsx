import { socialLinks } from '../data/content';
import { SocialIcon } from './ui/BackgroundEffects';
import GlowButton from './ui/GlowButton';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

export default function Contact() {
  return (
    <section id="contact" className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="Contact"
          title="Collaborate With Yellow Flag"
          description="Want to collaborate, sponsor, or invite Yellow Flag for an F1 discussion?"
        />

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <form
              className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Name</span>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none transition focus:border-yellow-400/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Email</span>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none transition focus:border-yellow-400/40"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Message</span>
                <textarea
                  rows={5}
                  placeholder="Tell us about your collaboration idea..."
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-white outline-none transition focus:border-yellow-400/40"
                />
              </label>

              <div className="mt-6">
                <GlowButton type="submit">Send Message</GlowButton>
              </div>
            </form>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="flex h-full flex-col justify-between rounded-[2rem] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/10 via-black/40 to-transparent p-8">
              <div>
                <h3 className="font-display text-2xl font-black uppercase tracking-[0.03em] text-white">Connect On Social</h3>
                <p className="mt-3 text-base leading-7 text-zinc-300">
                  Follow Yellow Flag for race reactions, podcast drops, and community updates across every platform.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-zinc-200 transition hover:border-yellow-400/30 hover:text-yellow-300"
                  >
                    <SocialIcon id={social.id} />
                    <span className="text-sm font-bold uppercase tracking-[0.14em]">{social.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
