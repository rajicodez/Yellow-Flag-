import { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { motion } from 'framer-motion';
import About from './components/About';
import Contact from './components/Contact';
import Drivers from './components/Drivers';
import Episodes from './components/episodes/Episodes';
import F1AssistantWidget from './components/F1AssistantWidget';
import Footer from './components/Footer';
import Game from './components/Game';
import Hero from './components/Hero';
import Journey from './components/Journey';
import Navbar from './components/Navbar';
import Schedule from './components/Schedule';
import Standing from './components/Standing';
import Teams from './components/Teams';
import Tracks from './components/Tracks';
import AdminPanel from './components/admin/AdminPanel';
import BackgroundEffects from './components/ui/BackgroundEffects';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { navItems } from './data/content';

let audioInstance = null;
let fallbackListenersAttached = false;
let globalInteractionHandler = null;

function useOpeningSound(enabled = true) {
  const isMounted = useRef(true);

  useEffect(() => {
    if (!enabled) return undefined;

    isMounted.current = true;

    const cleanupListeners = () => {
      if (fallbackListenersAttached && globalInteractionHandler) {
        window.removeEventListener('pointerdown', globalInteractionHandler);
        window.removeEventListener('touchstart', globalInteractionHandler);
        window.removeEventListener('keydown', globalInteractionHandler);
        fallbackListenersAttached = false;
      }
    };

    const markPlayed = () => {
      try {
        window.sessionStorage.setItem('yellowFlagOpeningSoundPlayed', 'true');
      } catch (e) {}
    };

    const checkPlayed = () => {
      try {
        return window.sessionStorage.getItem('yellowFlagOpeningSoundPlayed') === 'true';
      } catch (e) {
        return false;
      }
    };

    if (checkPlayed()) return;

    if (!audioInstance) {
      audioInstance = new Audio('/audio/open-sound.mp3');
      audioInstance.preload = 'auto';
      audioInstance.loop = false;
      audioInstance.volume = 0.6;

      globalInteractionHandler = () => {
        cleanupListeners();
        if (checkPlayed()) return;

        audioInstance.currentTime = 0;
        const p = audioInstance.play();
        if (p !== undefined) {
          p.then(() => {
            markPlayed();
          }).catch((err) => {
            console.warn('[OpeningSound] Interaction fallback failed:', err);
          });
        }
      };

      const p = audioInstance.play();
      if (p !== undefined) {
        p.then(() => {
          markPlayed();
        }).catch((err) => {
          if (err.name === 'NotAllowedError') {
            if (!fallbackListenersAttached) {
              fallbackListenersAttached = true;
              window.addEventListener('pointerdown', globalInteractionHandler, { once: true });
              window.addEventListener('touchstart', globalInteractionHandler, { once: true });
              window.addEventListener('keydown', globalInteractionHandler, { once: true });
            }
          } else {
            console.warn('[OpeningSound] Autoplay failed:', err);
          }
        });
      }
    }

    return () => {
      isMounted.current = false;
      
      // Delay cleanup to survive React Strict Mode double-invoke
      setTimeout(() => {
        if (!isMounted.current) {
          cleanupListeners();
          if (audioInstance && !audioInstance.paused && !checkPlayed()) {
            audioInstance.pause();
          }
        }
      }, 50);
    };
  }, [enabled]);
}

function HomePage() {
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();

  useEffect(() => {
    // IntersectionObserver measures its threshold against the target's own area,
    // so a section taller than the detection band never reports as intersecting
    // and the pill sticks on the previous item. Reading scroll position instead
    // works the same for a short hero and a very tall standings table.
    const ids = navItems.filter((item) => !item.path).map((item) => item.id);
    let frame = 0;

    const update = () => {
      frame = 0;
      // The marker line sits below the fixed header, roughly a third down the
      // viewport: whichever section has crossed it last is the one being read.
      const marker = window.scrollY + window.innerHeight * 0.35;
      let current = ids[0];

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) current = id;
      });

      // The final section is usually shorter than a screen, so it can never
      // reach the marker on its own — bottom of the page always belongs to it.
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
      if (atBottom) current = ids[ids.length - 1];

      setActiveSection(current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <>
      <Navbar activeSection={activeSection} />
      <main>
        <Hero />
        <Episodes />
        <About />
        <Journey />
        <Schedule />
        <Tracks />
        <Teams />
        <Standing />
        <Game />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

function DriversPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, []);

  return (
    <>
      <Navbar activeSection="drivers" />
      <main>
        <Drivers />
      </main>
      <Footer />
    </>
  );
}

function AppShell() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  useOpeningSound(!isAdminRoute);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-screen overflow-x-hidden text-white"
    >
      {!isAdminRoute && <BackgroundEffects />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/race-history" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdminRoute && <F1AssistantWidget />}
      <Analytics />
    </motion.div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
