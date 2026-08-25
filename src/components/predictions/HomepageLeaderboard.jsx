import { useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle, Medal, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Reveal from '../ui/Reveal';

const podiumStyles = [
  'border-yellow-300/40 bg-yellow-400/[0.11] shadow-[0_0_45px_rgba(250,204,21,0.08)]',
  'border-zinc-300/25 bg-white/[0.055]',
  'border-amber-700/30 bg-amber-700/[0.07]',
];

function Avatar({ name, src, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm';

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
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {podium.map((row, index) => (
                <article key={`${row.rank}-${row.display_name}`} className={`rounded-2xl border p-5 text-center ${podiumStyles[index]}`}>
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-display text-sm font-black text-yellow-300"><Medal className="h-4 w-4" /> #{row.rank}</div>
                  <div className="mx-auto mt-5 w-fit"><Avatar name={row.display_name} src={row.avatar_url} size="lg" /></div>
                  <h3 className="mt-4 truncate font-display text-xl font-black uppercase text-white">{row.display_name || 'Yellow Flag Fan'}</h3>
                  <p className="mt-2 font-display text-3xl font-black text-yellow-300">{row.score}<span className="ml-1 text-sm text-zinc-500">/ 7 PTS</span></p>
                </article>
              ))}
            </div>

            {remaining.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#101010]/90">
                {remaining.map((row) => (
                  <div key={`${row.rank}-${row.display_name}`} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 sm:px-6">
                    <span className="font-display text-xl font-black text-zinc-500">#{row.rank}</span>
                    <div className="flex min-w-0 items-center gap-3"><Avatar name={row.display_name} src={row.avatar_url} /><span className="truncate text-sm font-bold text-white sm:text-base">{row.display_name || 'Yellow Flag Fan'}</span></div>
                    <span className="font-display text-xl font-black text-yellow-300">{row.score}<span className="ml-1 text-xs text-zinc-500">PTS</span></span>
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
