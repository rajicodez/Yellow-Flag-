import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, LoaderCircle, Trophy, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { signInWithGoogle, supabase } from '../../lib/supabase';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo',
});

function getEntryKey(raceId, competition) {
  return `${raceId}:${competition}`;
}

function isRaceEditable(race) {
  return race?.status === 'open' && Date.now() < Date.parse(race.closes_at);
}

export default function MyPredictions() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [signInLoading, setSignInLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [standings, setStandings] = useState(new Map());
  const [detailsByEntry, setDetailsByEntry] = useState({});
  const [expandedEntryId, setExpandedEntryId] = useState('');
  const [detailsLoading, setDetailsLoading] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError('Unable to restore your session.');
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

  const loadEntries = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    setError('');
    try {
      const [{ data: entryRows, error: entriesError }, { data: leaderboardRows, error: leaderboardError }] = await Promise.all([
        supabase
          .from('prediction_entries')
          .select('id, race_id, competition, status, submitted_at, updated_at, races(id, slug, race_name, circuit_name, country_code, closes_at, race_starts_at, status)')
          .eq('user_id', authUser.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('race_prediction_leaderboard')
          .select('race_id, competition, rank, score')
          .eq('user_id', authUser.id),
      ]);
      if (entriesError) throw entriesError;
      if (leaderboardError) throw leaderboardError;

      setEntries(entryRows ?? []);
      setStandings(new Map((leaderboardRows ?? []).map((row) => [getEntryKey(row.race_id, row.competition), row])));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your predictions.');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser) loadEntries();
    else {
      setEntries([]);
      setStandings(new Map());
    }
  }, [authUser, loadEntries]);

  const toggleDetails = async (entry) => {
    if (expandedEntryId === entry.id) {
      setExpandedEntryId('');
      return;
    }
    setExpandedEntryId(entry.id);
    if (detailsByEntry[entry.id]) return;

    setDetailsLoading(entry.id);
    setError('');
    try {
      const [{ data: questions, error: questionsError }, { data: answers, error: answersError }] = await Promise.all([
        supabase.from('race_questions').select('id, question_number, question_text').eq('race_id', entry.race_id).order('question_number'),
        supabase.from('prediction_answers').select('question_id, answer_value').eq('entry_id', entry.id),
      ]);
      if (questionsError) throw questionsError;
      if (answersError) throw answersError;
      const answersByQuestion = new Map((answers ?? []).map((answer) => [answer.question_id, answer.answer_value]));
      setDetailsByEntry((current) => ({
        ...current,
        [entry.id]: (questions ?? []).map((question) => ({ ...question, answer: answersByQuestion.get(question.id) ?? 'No answer' })),
      }));
    } catch (detailsError) {
      setError(detailsError.message || 'Unable to load the submitted answers.');
    } finally {
      setDetailsLoading('');
    }
  };

  const handleSignIn = async () => {
    setSignInLoading(true);
    setError('');
    try {
      await signInWithGoogle('/predictions/mine');
    } catch (signInError) {
      setError(signInError.message || 'Unable to start Google sign-in.');
      setSignInLoading(false);
    }
  };

  if (authLoading) {
    return <section className="flex min-h-screen items-center justify-center px-5 pt-24"><div role="status" className="flex items-center gap-3 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading your predictions...</div></section>;
  }

  if (!authUser) {
    return (
      <section className="mx-auto flex min-h-[82vh] max-w-3xl items-center px-5 pb-16 pt-32 text-center md:px-8">
        <div className="w-full rounded-3xl border border-yellow-400/20 bg-[#101010]/90 p-8 shadow-[0_0_70px_rgba(250,204,21,0.08)] sm:p-12">
          <UserRound className="mx-auto h-11 w-11 text-yellow-400" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">Your Prediction Account</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase text-white sm:text-6xl">My Predictions</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">Sign in to review every submitted race, your seven answers, and scores after results are published.</p>
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}
          <button type="button" onClick={handleSignIn} disabled={signInLoading} className="mt-7 rounded-xl bg-yellow-400 px-7 py-3.5 font-display text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">{signInLoading ? 'Connecting...' : 'Continue with Google'}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto min-h-screen max-w-6xl px-5 pb-20 pt-32 md:px-8">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">Your Prediction Account</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase text-white sm:text-7xl">My Predictions</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Fan and Host entries remain separate. Scores and ranks appear only after an administrator publishes race results.</p>
      </div>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}

      {loading ? (
        <div role="status" className="flex items-center justify-center gap-3 py-24 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading submitted races...</div>
      ) : entries.length ? (
        <div className="mt-8 space-y-4">
          {entries.map((entry) => {
            const standing = standings.get(getEntryKey(entry.race_id, entry.competition));
            const editable = isRaceEditable(entry.races);
            const detailRows = detailsByEntry[entry.id] ?? [];
            const isExpanded = expandedEntryId === entry.id;
            const predictionUrl = `/predictions/${entry.races.slug}${entry.competition === 'host' ? '?competition=host' : ''}`;
            return (
              <article key={entry.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]/90">
                <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${entry.competition === 'host' ? 'border-violet-400/30 bg-violet-400/10 text-violet-300' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'}`}>{entry.competition === 'host' ? 'Host Entry' : 'Fan Entry'}</span>
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300">Submitted</span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-black uppercase text-white sm:text-3xl">{entry.races.race_name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{entry.races.circuit_name} · Submitted {dateFormatter.format(new Date(entry.submitted_at))}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Score</p>
                      <p className="mt-1 font-display text-2xl font-black text-white">{standing ? `${standing.score}/7` : 'Pending'}</p>
                    </div>
                    <div className="min-w-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Rank</p>
                      <p className="mt-1 font-display text-2xl font-black text-white">{standing ? `#${standing.rank}` : '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/10 bg-black/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500"><CalendarClock className="h-4 w-4 text-yellow-400" /> {editable ? `Editable until FP1 · ${dateFormatter.format(new Date(entry.races.closes_at))}` : 'Prediction entry is locked'}</div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {editable && <Link to={predictionUrl} className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.13em] text-yellow-300 transition hover:bg-yellow-400/15">Edit Prediction</Link>}
                    <button type="button" onClick={() => toggleDetails(entry)} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-zinc-300 transition hover:border-yellow-400/35 hover:text-yellow-300">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} {isExpanded ? 'Hide Answers' : 'View Answers'}</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/10 p-5 sm:p-6">
                    {detailsLoading === entry.id ? <div role="status" className="flex items-center gap-3 py-5 text-sm font-bold text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin text-yellow-400" /> Loading your seven answers...</div> : (
                      <ol className="grid gap-3 md:grid-cols-2">
                        {detailRows.map((detail) => <li key={detail.id} className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Question {detail.question_number}</p><p className="mt-1 text-sm font-semibold text-zinc-300">{detail.question_text}</p><p className="mt-3 font-display text-lg font-black uppercase text-yellow-300">{detail.answer}</p></li>)}
                      </ol>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-[#101010]/70 px-6 py-20 text-center">
          <Trophy className="mx-auto h-10 w-10 text-zinc-700" />
          <h2 className="mt-5 font-display text-3xl font-black uppercase text-white">No Predictions Yet</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-500">Once you submit a race prediction, it will appear here immediately.</p>
          <Link to="/#prediction" className="mt-6 inline-flex rounded-xl bg-yellow-400 px-6 py-3 font-display text-xs font-black uppercase tracking-[0.15em] text-black">Make a Prediction</Link>
        </div>
      )}
    </section>
  );
}
