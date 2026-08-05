import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BRAND, navItems } from '../data/content';

export default function Navbar({ activeSection }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleNav = (id) => {
    setOpen(false);

    if (location.pathname !== '/') {
      navigate(id === 'home' ? '/' : { pathname: '/', hash: id });
      return;
    }

    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const linkClass = (isActive) =>
    `rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition ${
      isActive
        ? 'bg-yellow-400/15 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
        : 'text-zinc-300 hover:text-yellow-300'
    }`;

  const mobileLinkClass = (isActive) =>
    `rounded-2xl px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.18em] ${
      isActive ? 'bg-yellow-400/15 text-yellow-300' : 'text-zinc-200'
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        // A hard border-b read as a bright hairline against the dark page. A soft
        // downward shadow separates the bar from the content without an edge.
        scrolled
          ? 'bg-black/75 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="group flex items-center text-left"
        >
          <img
            src="/logo.jpeg"
            alt="Yellow Flag logo"
            className="h-10 w-10 shrink-0 rounded-xl border border-yellow-400/30 object-cover shadow-[0_0_24px_rgba(250,204,21,0.2)]"
          />
          {/*
            The wordmark repeats the hero headline, so it stays collapsed over the
            hero and slides out once you scroll past it. Collapsing max-width (not
            just opacity) keeps it from occupying dead space while hidden; the
            left padding sits on the inner spans so the clip can reach a true 0.
            It stays in the DOM throughout, so the button keeps its accessible name.
          */}
          <span
            className={`overflow-hidden transition-all duration-300 ${
              scrolled ? 'max-w-[240px] opacity-100' : 'max-w-0 opacity-0'
            }`}
          >
            <span className="block whitespace-nowrap pl-3 font-display text-lg font-black uppercase tracking-[0.18em] text-white transition group-hover:text-yellow-300">
              {BRAND.name}
            </span>
            <span className="block whitespace-nowrap pl-3 text-[10px] uppercase tracking-[0.35em] text-zinc-400">
              Sinhala F1 Podcast
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) =>
            item.path ? (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setOpen(false)}
                className={linkClass(location.pathname === item.path || activeSection === item.id)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={linkClass(location.pathname === '/' && activeSection === item.id)}
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <button
          type="button"
          className="rounded-xl border border-white/10 p-3 text-white lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <HiX className="h-6 w-6" /> : <HiMenuAlt3 className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="border-t border-white/10 bg-black/95 px-5 py-6 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) =>
                item.path ? (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={mobileLinkClass(
                      location.pathname === item.path || activeSection === item.id
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    className={mobileLinkClass(location.pathname === '/' && activeSection === item.id)}
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
