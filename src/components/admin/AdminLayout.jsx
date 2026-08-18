import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  CircleHelp,
  Flag,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminNavigation } from './data';
import { RoleBadge } from './AdminUI';

const icons = {
  dashboard: LayoutDashboard,
  races: Flag,
  questions: CircleHelp,
  results: Calculator,
  leaderboard: Trophy,
  users: Users,
  raceHistory: History,
};

function SidebarContent({ activeScreen, onNavigate, onLogout }) {
  return (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <img src="/logo.jpeg" alt="" className="h-10 w-10 rounded-xl border border-yellow-400/30 object-cover" />
        <div>
          <p className="font-display text-base font-black uppercase tracking-[0.12em] text-white">Yellow Flag</p>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-yellow-400">Admin Control</p>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {adminNavigation.map((item) => {
          const Icon = icons[item.id];
          const active = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-yellow-400/50 ${
                active
                  ? 'bg-yellow-400 text-black shadow-[0_0_24px_rgba(250,204,21,0.12)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400/50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log Out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout({ activeScreen, adminUser, onNavigate, onLogout, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentPage = useMemo(
    () => adminNavigation.find((item) => item.id === activeScreen) ?? adminNavigation[0],
    [activeScreen]
  );
  const adminName = adminUser?.display_name
    || adminUser?.user_metadata?.full_name
    || adminUser?.email
    || 'Administrator';
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || 'A';

  const handleNavigate = (id) => {
    onNavigate(id);
    setDrawerOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    const handleKeyDown = (event) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  return (
    <div className="admin-font min-h-screen overflow-x-hidden bg-[#080809] text-white">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-white/10 bg-[#0d0d0f] lg:flex">
        <SidebarContent activeScreen={activeScreen} onNavigate={handleNavigate} onLogout={onLogout} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col border-r border-white/10 bg-[#0d0d0f] shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close admin menu"
              className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-black/40 p-2 text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <SidebarContent activeScreen={activeScreen} onNavigate={handleNavigate} onLogout={onLogout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080809]/92 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open admin menu"
                aria-expanded={drawerOpen}
                className="shrink-0 rounded-xl border border-white/10 p-2.5 text-white transition hover:border-yellow-400/35 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Control Centre <span className="px-1 text-zinc-700">/</span> {currentPage.label}
                </p>
                <h1 className="truncate font-display text-xl font-black uppercase text-white sm:text-2xl">{currentPage.label}</h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 p-1.5 pr-2.5 sm:pr-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 font-display text-xs font-black text-yellow-300">
                  {adminInitial}
                </span>
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-40 truncate text-xs font-bold text-white">{adminName}</p>
                  <div className="mt-0.5"><RoleBadge role={adminUser?.role ?? 'admin'} /></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(250,204,21,0.06),transparent_30%)]" />
          <div className="relative mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
