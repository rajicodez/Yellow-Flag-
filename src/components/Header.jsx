import { useState } from 'react';
import { navLinks } from '../data/content';
import { useHeaderScroll, useActiveSection } from '../hooks/useScrollEffects';

const SECTION_IDS = ['hero', 'about', 'episodes', 'topics', 'youtube', 'contact'];

function LogoIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="8" stroke="currentColor" strokeWidth="2" />
      <path d="M8 28h32M10 20h20M12 36h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="14" r="4" fill="currentColor" />
    </svg>
  );
}

export default function Header() {
  const scrolled = useHeaderScroll();
  const activeSection = useActiveSection(SECTION_IDS);
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = () => setNavOpen(false);

  const isActive = (href) => href === `#${activeSection}`;

  return (
    <header className={`header pit-wall-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-checker-strip" aria-hidden="true" />
      <nav className="nav container">
        <a href="#hero" className="logo" onClick={closeNav}>
          <span className="logo-icon">
            <LogoIcon />
          </span>
          <span className="logo-text">
            Sinhala<span className="accent">F1</span>
            <span className="logo-tag">Podcast</span>
          </span>
        </a>

        <button
          className={`nav-toggle ${navOpen ? 'open' : ''}`}
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>

        <ul className={`nav-links ${navOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={isActive(link.href) ? 'active' : undefined}
                onClick={closeNav}
              >
                <span className="nav-link-text">{link.label}</span>
              </a>
            </li>
          ))}
          <li className="nav-cta-wrap">
            <a href="#youtube" className="nav-cta" onClick={closeNav}>
              Watch Now
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
