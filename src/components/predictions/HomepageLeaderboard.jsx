import { useEffect, useState } from 'react';
import { ArrowRight, Crown, LoaderCircle, Medal, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Reveal from '../ui/Reveal';

const podiumLayout = [
  {
    card: 'md:order-2 md:min-h-[360px] md:-translate-y-5 border-yellow-300/50 bg-[linear-gradient(180deg,rgba(250,204,21,0.16),rgba(24,20,7,0.76))] shadow-[0_0_70px_rgba(250,204,21,0.13)]',
    badge: 'border-yellow-200/40 bg-yellow-400 text-black shadow-[0_0_28px_rgba(250,204,21,0.32)]',
    score: 'text-yellow-300',
    avatarSize: 'xl',
  },
  {
    card: 'md:order-1 md:mt-8 md:min-h-[320px] border-slate-300/25 bg-[linear-gradient(180deg,rgba(203,213,225,0.1),rgba(16,18,24,0.76))]',
    badge: 'border-slate-200/25 bg-slate-200 text-slate-950',
    score: 'text-slate-200',
    avatarSize: 'lg',
  },
  {
    card: 'md:order-3 md:mt-8 md:min-h-[320px] border-orange-500/25 bg-[linear-gradient(180deg,rgba(194,65,12,0.1),rgba(24,14,10,0.76))]',
    badge: 'border-orange-300/25 bg-orange-500 text-white',
    score: 'text-orange-400',
    avatarSize: 'lg',
  },
];

function Avatar({ name, src, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === 'xl'
    ? 'h-28 w-28 text-3xl sm:h-32 sm:w-32'
    : size === 'lg'
      ? 'h-24 w-24 text-2xl sm:h-28 sm:w-28'
      : 'h-12 w-12 text-base';

  if (src && !failed) {
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${sizeClass} rounded-full border border-white/15 object-cover`} />;
  }

  return <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 font-display font-black uppercase text-yellow-300`}>{name?.trim().charAt(0) || '?'}</span>;
}

export default function HomepageLeaderboard() {
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setState({ status: 'error', rows: [], error: 'Leaderboard is temporarily unavailable.' });
      return undefined;
    }

    supabase.rpc('get_homepage_fan_leaderboard').then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setState({ status: 'error', rows: [], error: 'Leaderboard is temporarily unavailable.' });
        return;
      }
      setState({ status: 'ready', rows: data ?? [], error: '' });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const podium = state.rows.slice(0, 3);
  const remaining = state.rows.slice(3, 10);
  const raceName = state.rows[0]?.race_name;
  const totalCompetitors = Number(state.rows[0]?.total_competitors ?? 0);

  return (
    <section id="leaderboard-preview" className="relative scroll-mt-24 overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.08),transparent_60%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">Prediction Championship</p>
              <h2 className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-6xl">Fan Leaderboard</h2>
              <p className="mt-3 text-sm text-zinc-400">{raceName ? `${raceName} · Published results` : 'Published race standings'}</p>
            </div>
            {totalCompetitors > 0 && <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{totalCompetitors} competitors</p>}
          </div>
        </Reveal>

        {state.status === 'loading' && (
          <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading standings...</div>
        )}

        {state.status === 'error' && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#101010]/90 px-6 py-14 text-center"><Trophy className="mx-auto h-9 w-9 text-zinc-700" /><p className="mt-4 font-display text-2xl font-black uppercase text-white">Leaderboard Unavailable</p><p className="mt-2 text-sm text-zinc-500">{state.error}</p></div>
        )}

        {state.status === 'ready' && !state.rows.length && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#101010]/90 px-6 py-14 text-center"><Trophy className="mx-auto h-10 w-10 text-zinc-700" /><p className="mt-4 font-display text-2xl font-black uppercase text-white">Results Coming Soon</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">The leaderboard will appear here after the official answers are verified and the race results are published.</p></div>
        )}

        {state.status === 'ready' && state.rows.length > 0 && (
          <>
            <div className="mt-14 grid items-end gap-4 md:grid-cols-3">
              {podium.map((row, index) => {
                const layout = podiumLayout[index];
                return (
                <article key={`${row.rank}-${row.display_name}`} className={`group relative flex min-h-[310px] flex-col items-center overflow-hidden rounded-[1.75rem] border px-5 pb-7 pt-9 text-center transition duration-300 hover:-translate-y-1 ${layout.card}`}>
                  <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                  <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-white/[0.055] blur-3xl" />
                  <div className={`relative z-10 flex h-12 min-w-12 items-center justify-center gap-1.5 rounded-2xl border px-3 font-display text-lg font-black ${layout.badge}`}>
                    {index === 0 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />} #{row.rank}
                  </div>
                  <div className="relative z-10 mx-auto mt-6 w-fit rounded-full bg-gradient-to-br from-white/40 via-white/10 to-transparent p-[3px] shadow-[0_14px_35px_rgba(0,0,0,0.4)]">
                    <Avatar name={row.display_name} src={row.avatar_url} size={layout.avatarSize} />
                  </div>
                  <h3 className="relative z-10 mt-5 max-w-full truncate font-display text-xl font-black uppercase text-white sm:text-2xl">{row.display_name || 'Yellow Flag Fan'}</h3>
                  <p className={`relative z-10 mt-2 font-display text-4xl font-black ${layout.score}`}>{row.score}<span className="ml-1.5 text-sm text-zinc-500">/ 7 PTS</span></p>
                </article>
                );
              })}
            </div>

            {remaining.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#101010]/90">
                {remaining.map((row) => (
                  <div key={`${row.rank}-${row.display_name}`} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-4 py-4 transition hover:bg-white/[0.025] last:border-b-0 sm:px-6 sm:py-5">
                    <span className="font-display text-xl font-black text-zinc-500">#{row.rank}</span>
                    <div className="flex min-w-0 items-center gap-4"><Avatar name={row.display_name} src={row.avatar_url} /><div className="min-w-0"><span className="block truncate text-sm font-bold text-white sm:text-base">{row.display_name || 'Yellow Flag Fan'}</span><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:w-36"><div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300" style={{ width: `${Math.min(100, (Number(row.score) / 7) * 100)}%` }} /></div></div></div>
                    <span className="font-display text-2xl font-black text-yellow-300">{row.score}<span className="ml-1 text-xs text-zinc-500">PTS</span></span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <Link to="/predictions/leaderboard" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-7 py-4 font-display text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200">View Full Leaderboard <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
