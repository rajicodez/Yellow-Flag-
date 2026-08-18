import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Flag, LoaderCircle, Search, Trophy, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { EmptyNotice, inputClass, Panel, ScreenHeading, StatusBadge } from '../AdminUI';
import useAdminResults from '../useAdminResults';

const completedStatuses = new Set(['locked', 'scored', 'published']);
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo',
});

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-yellow-400" /><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-1 font-display text-xl font-black text-white">{value}</p></div></div></div>;
}

function Initial({ name }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 font-display text-xs font-black uppercase text-yellow-300">{name?.charAt(0) || '?'}</span>;
}

export default function RaceHistoryScreen() {
  const workspace = useAdminResults();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [competition, setCompetition] = useState('user');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const completedRaces = useMemo(() => workspace.races
    .filter((race) => completedStatuses.has(race.databaseStatus))
    .sort((first, second) => new Date(second.raceStart) - new Date(first.raceStart)), [workspace.races]);

  const filteredRaces = useMemo(() => completedRaces.filter((race) => {
    const matchesSearch = `${race.name} ${race.circuit} ${race.season}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'All' || race.status === status);
  }), [completedRaces, search, status]);

  const selectedRace = completedRaces.find((race) => race.id === selectedRaceId) ?? null;
  const questions = workspace.questionsByRaceId[selectedRaceId] ?? [];
  const officialAnswers = workspace.officialAnswersByRaceId[selectedRaceId] ?? {};

  useEffect(() => {
    if (!selectedRace) {
      setLeaderboard([]);
      return;
    }
    if (selectedRace.databaseStatus !== 'published') {
      setLeaderboard([]);
      setLeaderboardError('');
      return;
    }

    let mounted = true;
    setLeaderboardLoading(true);
    setLeaderboardError('');
    supabase
      .from('race_prediction_leaderboard')
      .select('rank, entry_id, user_id, display_name, avatar_url, score, submitted_at')
      .eq('race_id', selectedRace.id)
      .eq('competition', competition)
      .order('rank', { ascending: true })
      .order('display_name', { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setLeaderboard([]);
          setLeaderboardError(error.message || 'Unable to load the published leaderboard.');
        } else setLeaderboard(data ?? []);
        setLeaderboardLoading(false);
      });
    return () => { mounted = false; };
  }, [competition, selectedRace]);

  if (workspace.loading && !workspace.races.length) {
    return <div role="status" className="flex items-center gap-3 text-sm font-bold text-zinc-300"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading race history...</div>;
  }

  if (selectedRace) {
    const scores = leaderboard.map((row) => Number(row.score));
    const averageScore = scores.length ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1) : '—';
    return (
      <div className="space-y-7">
        <button type="button" onClick={() => setSelectedRaceId('')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300"><ArrowLeft className="h-4 w-4" /> Back to Race History</button>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 bg-[linear-gradient(115deg,rgba(250,204,21,0.12),transparent_48%)] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Round {selectedRace.round} · {selectedRace.season}</p><h2 className="mt-2 font-display text-3xl font-black uppercase text-white sm:text-4xl">{selectedRace.name}</h2><p className="mt-2 text-sm text-zinc-400">{selectedRace.circuit} · {dateFormatter.format(new Date(selectedRace.raceStart))}</p></div><StatusBadge status={selectedRace.status} /></div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6"><Metric label="Submissions" value={workspace.entryCountByRaceId[selectedRace.id] ?? 0} icon={Users} /><Metric label="Scoring Version" value={workspace.latestRunByRaceId[selectedRace.id]?.version ?? 'Pending'} icon={BarChart3} /><Metric label="Questions" value={questions.length} icon={CheckCircle2} /></div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4 sm:px-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Read Only</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">Official Answers</h3></div>
          {questions.length ? <div className="grid gap-3 p-4 md:grid-cols-2 sm:p-6">{questions.map((question) => {
            const answerValue = officialAnswers[question.id];
            const option = (workspace.optionsByQuestionId[question.id] ?? []).find((candidate) => candidate.value === answerValue);
            return <article key={question.id} className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Question {question.number} · {question.type}</p><p className="mt-2 text-sm font-semibold leading-6 text-zinc-300">{question.text}</p><p className={`mt-3 font-display text-lg font-black uppercase ${answerValue ? 'text-yellow-300' : 'text-amber-300'}`}>{option?.name ?? answerValue ?? 'Results pending'}</p></article>;
          })}</div> : <div className="p-6"><EmptyNotice>No question set is available for this race.</EmptyNotice></div>}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Published Standings</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">Race Leaderboard</h3></div><div className="flex rounded-xl border border-white/10 bg-black/30 p-1">{[['user', 'Fans'], ['host', 'Hosts']].map(([value, label]) => <button key={value} type="button" onClick={() => setCompetition(value)} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[0.13em] ${competition === value ? 'bg-yellow-400 text-black' : 'text-zinc-400'}`}>{label}</button>)}</div></div>
          {selectedRace.databaseStatus !== 'published' ? <div className="p-6"><EmptyNotice>Scores are not public yet. Publish them from Results & Scoring when review is complete.</EmptyNotice></div> : leaderboardLoading ? <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading published standings...</div> : leaderboardError ? <div role="alert" className="m-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{leaderboardError}</div> : leaderboard.length ? <>
            <div className="grid gap-3 border-b border-white/10 p-5 sm:grid-cols-3 sm:p-6"><Metric label="Published Entries" value={leaderboard.length} icon={Users} /><Metric label="Average Score" value={`${averageScore}/7`} icon={BarChart3} /><Metric label="Highest Score" value={`${Math.max(...scores)}/7`} icon={Trophy} /></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-black/35 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500"><tr><th className="px-5 py-3.5">Rank</th><th className="px-4 py-3.5">Competitor</th><th className="px-4 py-3.5">Score</th><th className="px-5 py-3.5">Submitted</th></tr></thead><tbody className="divide-y divide-white/10">{leaderboard.map((row) => <tr key={row.entry_id}><td className="px-5 py-4 font-display text-xl font-black text-yellow-300">#{row.rank}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><Initial name={row.display_name} /><span className="font-bold text-white">{row.display_name}</span></div></td><td className="px-4 py-4 font-display text-xl font-black text-white">{row.score}/7</td><td className="px-5 py-4 text-xs text-zinc-400">{dateFormatter.format(new Date(row.submitted_at))}</td></tr>)}</tbody></table></div>
          </> : <div className="p-6"><EmptyNotice>No {competition === 'user' ? 'fan' : 'host'} scores were published for this race.</EmptyNotice></div>}
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <ScreenHeading eyebrow="Completed Races" title="Race History" description="Read-only official answers, scoring state, and published standings from Supabase." />
      {workspace.error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{workspace.error}</div>}
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search completed races" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} sm:w-48`}><option>All</option><option>Closed</option><option>Scored</option><option>Published</option></select></div>
        {filteredRaces.length ? <div className="divide-y divide-white/10">{filteredRaces.map((race) => <article key={race.id} className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-yellow-300"><Flag className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-black uppercase text-white">{race.name}</h2><StatusBadge status={race.status} /></div><p className="mt-1 text-xs text-zinc-500">Round {race.round} · {race.circuit} · {dateFormatter.format(new Date(race.raceStart))}</p><p className="mt-2 text-xs font-semibold text-zinc-400">{workspace.entryCountByRaceId[race.id] ?? 0} submissions · Score version {workspace.latestRunByRaceId[race.id]?.version ?? 'pending'}</p></div></div><button type="button" onClick={() => setSelectedRaceId(race.id)} className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-yellow-300 transition hover:bg-yellow-400/15">View Official Record</button></article>)}</div> : <div className="p-6"><EmptyNotice>{completedRaces.length ? 'No completed races match those filters.' : 'Completed races will appear here after predictions close at FP1.'}</EmptyNotice></div>}
      </Panel>
    </div>
  );
}
