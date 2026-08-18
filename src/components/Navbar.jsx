import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import { LogOut, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BRAND, navItems } from '../data/content';
import { signInWithGoogle, supabase } from '../lib/supabase';

export default function Navbar({ activeSection }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isGoogleSignInLoading, setIsGoogleSignInLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const accountMenuRef = useRef(null);
  const accountButtonRef = useRef(null);
  const loginDialogRef = useRef(null);
  const googleButtonRef = useRef(null);
  const wasLoginOpenRef = useRef(false);
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

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) throw error;

        setAuthUser(data.session?.user ?? null);
      } catch {
        if (isMounted) setAuthUser(null);
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setAuthUser(session?.user ?? null);
      setIsAuthLoading(false);
      setIsSigningOut(false);

      if (!session?.user) setIsAccountOpen(false);
    });

    restoreSession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAccountOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountOpen]);

  useEffect(() => {
    if (!isLoginOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => googleButtonRef.current?.focus());

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isGoogleSignInLoading) {
        setIsLoginOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          loginDialogRef.current?.querySelectorAll('button:not(:disabled)') ?? []
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isLoginOpen, isGoogleSignInLoading]);

  useEffect(() => {
    if (isLoginOpen) {
      wasLoginOpenRef.current = true;
      return;
    }

    if (wasLoginOpenRef.current) {
      wasLoginOpenRef.current = false;
      accountButtonRef.current?.focus();
    }
  }, [isLoginOpen]);

  const userDisplayName = authUser?.user_metadata?.full_name
    || authUser?.user_metadata?.name
    || authUser?.email
    || 'Signed in user';
  const userAvatarUrl = authUser?.user_metadata?.avatar_url
    || authUser?.user_metadata?.picture
    || null;
  const userInitial = userDisplayName.trim().charAt(0).toUpperCase() || 'Y';

  useEffect(() => {
    setAvatarFailed(false);
  }, [userAvatarUrl]);

  const openLoginModal = () => {
    setOpen(false);
    setIsAccountOpen(false);
    setLoginError('');
    setIsLoginOpen(true);
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setIsGoogleSignInLoading(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Unable to start Google sign-in. Please try again.'
      );
      setIsGoogleSignInLoading(false);
    }
  };

  const handleAccountClick = () => {
    setOpen(false);
    setLogoutError('');
    setIsAccountOpen((current) => !current);
  };

  const handleLogout = async () => {
    if (!supabase) {
      setLogoutError('Supabase authentication is not configured.');
      return;
    }

    setLogoutError('');
    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setIsAccountOpen(false);
    } catch {
      setLogoutError('Unable to log out right now. Please try again.');
      setIsSigningOut(false);
    }
  };

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
    `whitespace-nowrap rounded-full px-2 py-2 text-xs font-bold uppercase tracking-[0.08em] transition xl:px-3 xl:tracking-[0.1em] min-[1750px]:tracking-[0.14em] ${
      isActive
        ? 'bg-yellow-400/15 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
        : 'text-zinc-300 hover:text-yellow-300'
    }`;

  const mobileLinkClass = (isActive) =>
    `rounded-2xl px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.18em] ${
      isActive ? 'bg-yellow-400/15 text-yellow-300' : 'text-zinc-200'
    }`;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          // A hard border-b read as a bright hairline against the dark page. A soft
          // downward shadow separates the bar from the content without an edge.
          scrolled
            ? 'bg-black/75 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-x-3 gap-y-0 px-5 py-3 md:px-8 xl:flex-nowrap xl:py-4">
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="group order-1 flex shrink-0 items-center text-left"
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

        <nav className="order-3 hidden w-full items-center justify-center gap-0.5 lg:flex xl:order-2 xl:min-w-0 xl:flex-1 xl:w-auto">
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

        <div className="order-2 flex shrink-0 items-center gap-2 xl:order-3">
          <button
            type="button"
            className="rounded-xl border border-white/10 p-3 text-white transition hover:border-yellow-400/30 hover:text-yellow-300 lg:hidden"
            onClick={() => {
              setIsAccountOpen(false);
              setOpen((current) => !current);
            }}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <HiX className="h-6 w-6" /> : <HiMenuAlt3 className="h-6 w-6" />}
          </button>

          <div ref={accountMenuRef} className="relative">
            {isAuthLoading ? (
              <button
                type="button"
                disabled
                aria-label="Checking sign-in status"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-zinc-400"
              >
                <UserRound className="h-5 w-5 animate-pulse" aria-hidden="true" />
              </button>
            ) : authUser ? (
              <button
                ref={accountButtonRef}
                type="button"
                onClick={handleAccountClick}
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={isAccountOpen}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-400/50 bg-[#121212] text-white shadow-[0_0_14px_rgba(250,204,21,0.16)] transition hover:border-yellow-300 hover:shadow-[0_0_18px_rgba(250,204,21,0.24)]"
              >
                {userAvatarUrl && !avatarFailed ? (
                  <img
                    src={userAvatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-yellow-400/10 font-display text-sm font-black uppercase text-yellow-300">
                    {userInitial}
                  </span>
                )}
              </button>
            ) : (
              <button
                ref={accountButtonRef}
                type="button"
                onClick={openLoginModal}
                aria-label="Sign in to Yellow Flag"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300"
              >
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            <AnimatePresence>
              {authUser && isAccountOpen && (
                <motion.div
                  role="menu"
                  aria-label="Yellow Flag account menu"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-72 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#121212]/98 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3">
                    {userAvatarUrl && !avatarFailed ? (
                      <img
                        src={userAvatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                        className="h-11 w-11 shrink-0 rounded-full border border-yellow-400/35 object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 font-display text-sm font-black uppercase text-yellow-300">
                        {userInitial}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{userDisplayName}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-400">
                        {authUser.email || 'Email unavailable'}
                      </p>
                    </div>
                  </div>

                  {logoutError && (
                    <p role="alert" className="mx-2 mt-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300">
                      {logoutError}
                    </p>
                  )}

                  <div className="space-y-1 py-2">
                    <Link
                      to="/predictions/mine"
                      role="menuitem"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-200 transition hover:bg-yellow-400/10 hover:text-yellow-300"
                    >
                      My Predictions
                    </Link>
                    <Link
                      to="/predictions/leaderboard"
                      role="menuitem"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-200 transition hover:bg-yellow-400/10 hover:text-yellow-300"
                    >
                      Prediction Leaderboard
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      disabled={isSigningOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-zinc-200 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {isSigningOut ? 'Logging Out...' : 'Log Out'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
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

      <AnimatePresence>
        {isLoginOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isGoogleSignInLoading) {
                setIsLoginOpen(false);
              }
            }}
          >
            <motion.div
              ref={loginDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="navbar-login-title"
              aria-describedby="navbar-login-description"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#121212] p-6 shadow-[0_0_50px_rgba(250,204,21,0.12)] sm:p-8"
            >
              <div className="mb-6 border-b border-white/10 pb-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                  Account Access
                </p>
                <h2 id="navbar-login-title" className="font-display text-3xl font-black uppercase text-white">
                  Yellow Flag <span className="text-yellow-400">Account</span>
                </h2>
                <p id="navbar-login-description" className="mt-3 text-sm leading-6 text-zinc-400">
                  Sign in to continue
                </p>
              </div>

              {loginError && (
                <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-300">
                  {loginError}
                </p>
              )}

              <div className="space-y-3">
                <button
                  ref={googleButtonRef}
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSignInLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 font-display font-black uppercase tracking-wider text-black transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70"
                >
                  <FcGoogle className="h-5 w-5" aria-hidden="true" />
                  {isGoogleSignInLoading ? 'Connecting...' : 'Continue with Google'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(false)}
                  disabled={isGoogleSignInLoading}
                  className="w-full rounded-xl border border-white/20 px-5 py-3 font-display font-bold uppercase tracking-widest text-white transition hover:bg-white/5 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
