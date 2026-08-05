import { BRAND, navItems, socialLinks, studio } from '../data/content';
import { SocialIcon } from './ui/BackgroundEffects';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/70 py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="Yellow Flag logo"
              className="h-10 w-10 rounded-xl border border-yellow-400/30 object-cover"
            />
            <span className="font-display text-xl font-black uppercase tracking-[0.18em] text-white">{BRAND.name}</span>
          </div>
          <p className="mt-4 max-w-md text-base leading-7 text-zinc-300">{BRAND.footerTagline}</p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-300">Quick Links</h3>
          <ul className="mt-4 space-y-3">
            {navItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-zinc-300 transition hover:text-yellow-300">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-300">Social</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-yellow-400/30 hover:text-yellow-300"
                aria-label={social.label}
              >
                <SocialIcon id={social.id} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-5 pt-6 text-sm text-zinc-500 md:px-8">
        © {new Date().getFullYear()} {BRAND.name}. All Rights Reserved. Built by{' '}
        <a
          href={studio.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-yellow-400 transition hover:text-yellow-300 hover:underline hover:underline-offset-4"
        >
          {studio.name}
        </a>
        .
      </div>
    </footer>
  );
}
