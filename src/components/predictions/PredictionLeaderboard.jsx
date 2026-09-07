import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Medal, RefreshCw, Trophy, UserRound } from 'lucide-react';
import { signInWithGoogle, supabase } from '../../lib/supabase';
import KindforthCredit from '../ui/KindforthCredit';

const competitionOptions = [
  { value: 'user', label: 'Fans' },
  { value: 'host', label: 'Hosts' },
];

const modeOptions = [
  { value: 'race', label: 'Race' },
  { value: 'season', label: 'Season' },
];

function InitialAvatar({ name }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-display text-sm font-black uppercase text-yellow-300">
      {name?.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function Competitor({ row }) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {row.avatar_url && !avatarFailed ? (
        <img
          src={row.avatar_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setAvatarFailed(true)}
          className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <InitialAvatar name={row.display_name} />
      )}
      <span className="font-bold text-white">{row.display_name || 'Yellow Flag Fan'}</span>
    </div>
  );
}

function Rank({ value }) {
  if (Number(value) <= 3) {
    const colors = ['text-yellow-300', 'text-zinc-200', 'text-amber-600'];
    return (
      <span className={`inline-flex items-center gap-2 font-display text-xl font-black ${colors[Number(value) - 1]}`}>
        <Medal className="h-5 w-5" aria-hidden="true" /> {value}
      </span>
    );
  }

  return <span className="font-display text-xl font-black text-zinc-400">{value}</span>;
}

export default function PredictionLeaderboard() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [signInLoading, setSignInLoading] = useState(false);
  const [mode, setMode] = useState('race');
  const [competition, setCompetition] = useState('user');
  const [publishedRaces, setPublishedRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadPublishedRaces = useCallback(async () => {
    const { data, error: raceError } = await supabase
      .from('races')
      .select('id, race_name, slug, round_number, seasons(year)')
      .eq('status', 'published')
      .order('round_number', { ascending: false });

    if (raceError) throw raceError;

    const races = data ?? [];
    setPublishedRaces(races);
    setSelectedRaceId((current) => (
      races.some((race) => race.id === current) ? current : races[0]?.id ?? ''
    ));

    const newestSeason = Math.max(
      new Date().getFullYear(),
      ...races.map((race) => Number(race.seasons?.year)).filter(Number.isFinite)
    );
    setSeasonYear(newestSeason);
  }, []);

  const loadRows = useCallback(async () => {
    if (!authUser || (mode === 'race' && !selectedRaceId)) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = mode === 'race'
        ? supabase
            .from('race_prediction_leaderboard')
            .select('rank, entry_id, user_id, display_name, avatar_url, score')
            .eq('race_id', selectedRaceId)
            .eq('competition', competition)
            .order('rank', { ascending: true })
            .order('display_name', { ascending: true })
        : supabase
            .from('season_prediction_leaderboard')
            .select('rank, user_id, display_name, avatar_url, races_entered, total_score, score_7_count, score_6_count, score_5_count')
            .eq('season_year', seasonYear)
            .eq('competition', competition)
            .order('rank', { ascending: true })
            .order('display_name', { ascending: true });

      const { data, error: leaderboardError } = await query;
      if (leaderboardError) throw leaderboardError;
      setRows(data ?? []);
    } catch (loadError) {
      setRows([]);
      setError(loadError.message || 'Unable to load the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [authUser, competition, mode, seasonYear, selectedRaceId]);

  useEffect(() => {
    if (!authUser) {
      setPublishedRaces([]);
      setRows([]);
      return;
    }

    setError('');
    loadPublishedRaces().catch((loadError) => {
      setError(loadError.message || 'Unable to load published races.');
    });
  }, [authUser, loadPublishedRaces]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const selectedRace = useMemo(
    () => publishedRaces.find((race) => race.id === selectedRaceId) ?? null,
    [publishedRaces, selectedRaceId]
  );

  const handleSignIn = async () => {
    setSignInLoading(true);
    setError('');
    try {
      await signInWithGoogle('/predictions/leaderboard');
    } catch (signInError) {
      setError(signInError.message || 'Unable to start Google sign-in.');
      setSignInLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      await loadPublishedRaces();
      await loadRows();
    } catch (refreshError) {
      setError(refreshError.message || 'Unable to refresh the leaderboard.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center px-5 pt-24">
        <div role="status" className="flex items-center gap-3 text-sm font-bold text-zinc-400">
          <LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading leaderboard...
        </div>
      </section>
    );
  }

  if (!authUser) {
    return (
      <section className="mx-auto flex min-h-[82vh] max-w-3xl items-center px-5 pb-16 pt-32 text-center md:px-8">
        <div className="w-full rounded-3xl border border-yellow-400/20 bg-[#101010]/90 p-8 shadow-[0_0_70px_rgba(250,204,21,0.08)] sm:p-12">
          <UserRound className="mx-auto h-11 w-11 text-yellow-400" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">Prediction Championship</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-6xl">Fan Leaderboard</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
            Sign in to view published race rankings, season points, and the separate Hosts Championship.
          </p>
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}
          <button type="button" onClick={handleSignIn} disabled={signInLoading} className="mt-7 rounded-xl bg-yellow-400 px-7 py-3.5 font-display text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">
            {signInLoading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto min-h-screen max-w-7xl px-5 pb-20 pt-32 md:px-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">Prediction Championship</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase text-white sm:text-7xl">Leaderboard</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Published scores only. Fan and Host competitions are always ranked separately, and tied scores share the same rank.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="flex w-fit items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-300 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="mt-8 grid gap-5 rounded-2xl border border-white/10 bg-[#101010]/90 p-5 lg:grid-cols-[auto_auto_minmax(240px,1fr)] lg:items-end sm:p-6">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-zinc-500">Standings</p>
          <div className="flex w-fit rounded-xl border border-white/10 bg-black/30 p-1">
            {modeOptions.map((option) => <button key={option.value} type="button" onClick={() => setMode(option.value)} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-[0.13em] ${mode === option.value ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}>{option.label}</button>)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-zinc-500">Competition</p>
          <div className="flex w-fit rounded-xl border border-white/10 bg-black/30 p-1">
            {competitionOptions.map((option) => <button key={option.value} type="button" onClick={() => setCompetition(option.value)} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-[0.13em] ${competition === option.value ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}>{option.label}</button>)}
          </div>
        </div>
        {mode === 'race' ? (
          <label className="block lg:justify-self-end">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-zinc-500">Published Race</span>
            <select value={selectedRaceId} onChange={(event) => setSelectedRaceId(event.target.value)} disabled={!publishedRaces.length} className="w-full min-w-[260px] rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-bold text-white outline-none focus:border-yellow-400/50 disabled:text-zinc-600">
              {!publishedRaces.length && <option value="">No published races</option>}
              {publishedRaces.map((race) => <option key={race.id} value={race.id}>R{race.round_number} · {race.race_name}</option>)}
            </select>
          </label>
        ) : (
          <div className="lg:justify-self-end">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-zinc-500">Season</p>
            <div className="rounded-xl border border-white/10 bg-black/50 px-5 py-3 font-display text-lg font-black text-white">{seasonYear}</div>
          </div>
        )}
      </div>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#101010]/90">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <div>
            <h2 className="font-display text-xl font-black uppercase text-white">{mode === 'race' ? selectedRace?.race_name || 'Race Standings' : `${seasonYear} Season`} · {competition === 'user' ? 'Fans' : 'Hosts'}</h2>
            <p className="mt-1 text-xs text-zinc-500">Maximum seven points per race</p>
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 px-6 py-20 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading standings...</div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                <tr><th className="px-5 py-3">Rank</th><th className="px-5 py-3">Competitor</th><th className="px-5 py-3">{mode === 'race' ? 'Score' : 'Total'}</th>{mode === 'season' && <><th className="px-5 py-3">Races</th><th className="px-5 py-3">7/7</th><th className="px-5 py-3">6/7</th><th className="px-5 py-3">5/7</th></>}</tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => (
                  <tr key={row.entry_id ?? row.user_id} className={`text-sm text-zinc-300 ${row.user_id === authUser.id ? 'bg-yellow-400/[0.06]' : ''}`}>
                    <td className="px-5 py-4"><Rank value={row.rank} /></td>
                    <td className="px-5 py-4"><Competitor row={row} /></td>
                    <td className="px-5 py-4 font-display text-2xl font-black text-white">{mode === 'race' ? `${row.score}/7` : row.total_score}</td>
                    {mode === 'season' && <><td className="px-5 py-4">{row.races_entered}</td><td className="px-5 py-4">{row.score_7_count}</td><td className="px-5 py-4">{row.score_6_count}</td><td className="px-5 py-4">{row.score_5_count}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-20 text-center">
            <Trophy className="mx-auto h-10 w-10 text-zinc-700" />
            <p className="mt-5 font-display text-2xl font-black uppercase text-white">No Published Scores Yet</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">The leaderboard will appear here after an administrator scores and publishes a completed race.</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <KindforthCredit label="Leaderboard technology by" />
      </div>
    </section>
  );
}
