import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Flag,
  Gauge,
  History,
  LockKeyhole,
  Search,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { DemoLabel, EmptyNotice, inputClass, Panel, ScreenHeading } from '../AdminUI';
import { demoLeaderboardByRaceId, demoResultsByRaceId } from '../data';
import { getAdminRosterForSeason } from '../rosters';
import { getRaceStableId } from '../useAdminRaceWorkspace';

const completedStatuses = new Set(['Closed', 'Scored', 'Published']);
const tabs = [
  { id: 'answers', label: 'Correct Answers', icon: CheckCircle2 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'statistics', label: 'Race Statistics', icon: BarChart3 },
];

const statusStyles = {
  'Results Pending': 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Scored: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
  Published: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  'Not Published': 'border-zinc-400/20 bg-zinc-400/10 text-zinc-400',
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const scoringStatusFor = (race, result) => {
  if (race.status === 'Closed' && !result?.scoringStatus) return 'Results Pending';
  return result?.scoringStatus ?? race.status;
};

const leaderboardStatusFor = (result) => result?.leaderboardStatus ?? 'Not Published';

function HistoryStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${statusStyles[status] ?? statusStyles['Not Published']}`}>
      {status}
    </span>
  );
}

function WeekendBadge({ sprintWeekend }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
      sprintWeekend
        ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
        : 'border-white/10 bg-white/5 text-zinc-400'
    }`}>
      {sprintWeekend && <Zap className="h-3 w-3" aria-hidden="true" />}
      {sprintWeekend ? 'Sprint Weekend' : 'Normal Race'}
    </span>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p>
          <p className="mt-1 break-words text-sm font-bold text-zinc-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function UserInitial({ name, large = false }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 font-display font-black uppercase text-yellow-300 ${large ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs'}`}>
      {name.charAt(0)}
    </span>
  );
}

function EmptyHistory({ filtered }) {
  return (
    <EmptyNotice>
      {filtered ? (
        <p className="font-semibold text-zinc-300">No races match your current filters.</p>
      ) : (
        <>
          <p className="font-display text-lg font-black uppercase text-white">No race history yet</p>
          <p className="mt-2">Completed and scored races will appear here.</p>
        </>
      )}
    </EmptyNotice>
  );
}

function PendingResultsNotice() {
  return (
    <EmptyNotice>
      <p className="font-display text-lg font-black uppercase text-amber-300">Results Pending</p>
      <p className="mx-auto mt-2 max-w-lg">The race has finished, but correct answers and scores have not been completed.</p>
    </EmptyNotice>
  );
}

function resolveAnswer(answerId, type, roster) {
  const options = type === 'Driver' ? roster.drivers : roster.constructors;
  return options.find((option) => option.answerId === answerId) ?? null;
}

function CorrectAnswers({ questions, result, race }) {
  if (!result?.correctAnswers) return <PendingResultsNotice />;

  const roster = getAdminRosterForSeason(race.season);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-black uppercase text-white">Recorded Correct Answers</h3>
          <p className="mt-1 text-sm text-zinc-500">All values below are locked and cannot be edited from Race History.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300">
          <LockKeyhole className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" /> Read only
        </span>
      </div>

      {questions.map((question, index) => {
        const answerId = result.correctAnswers[question.key];
        const answer = resolveAnswer(answerId, question.type, roster);
        const isDriver = question.type === 'Driver';

        return (
          <article key={question.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 font-display text-sm font-black text-black">
                  Q{index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">{question.type}</span>
                    {question.sprint && <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">Sprint</span>}
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300">{question.points} point{question.points === 1 ? '' : 's'}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-zinc-200">{question.text}</p>
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] p-3 sm:w-[min(100%,20rem)]">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Correct answer</p>
                {answer ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: answer.color }} aria-hidden="true" />
                    {!isDriver && answer.logoUrl ? (
                      <img src={answer.logoUrl} alt="" className={`h-8 w-10 shrink-0 object-contain ${answer.invertLogo ? 'brightness-0 invert' : ''}`} />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[10px] font-black text-white">{isDriver ? answer.number : answer.initials}</span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{answer.name}</p>
                      <p className="truncate text-xs text-zinc-500">{isDriver ? `#${answer.number} - ${answer.teamName}` : answer.fullName}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-zinc-400">Correct answer not recorded.</p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RaceLeaderboard({ rows, published, maximumPoints }) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filteredRows = useMemo(
    () => rows.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase())),
    [rows, search]
  );
  const visibleRows = showAll || search ? filteredRows : filteredRows.slice(0, 10);

  if (!published || !rows.length) {
    return (
      <EmptyNotice>
        <Trophy className="mx-auto h-6 w-6 text-zinc-600" aria-hidden="true" />
        <p className="mt-3 font-semibold text-zinc-300">The leaderboard has not been published for this race.</p>
      </EmptyNotice>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-black uppercase text-white">Race Leaderboard</h3>
          <p className="mt-1 text-sm text-zinc-500">Fictional usernames and demonstration points only.</p>
        </div>
        <DemoLabel>Demo Users</DemoLabel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rows.slice(0, 3).map((row, index) => (
          <div key={row.position} className={`relative overflow-hidden rounded-2xl border p-4 ${index === 0 ? 'border-yellow-400/30 bg-yellow-400/[0.08]' : 'border-white/10 bg-black/25'}`}>
            <span className="absolute right-3 top-2 font-display text-5xl font-black text-white/[0.04]">0{row.position}</span>
            <div className="relative flex items-center gap-3">
              <UserInitial name={row.name} large />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-black uppercase text-white">{row.name}</p>
                <p className="text-xs text-zinc-500">Position {row.position}</p>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-black/25 p-2"><p className="text-[8px] font-black uppercase text-zinc-500">Correct</p><p className="mt-1 font-display font-black text-white">{row.correctAnswers}/{maximumPoints}</p></div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-2"><p className="text-[8px] font-black uppercase text-zinc-500">Race</p><p className="mt-1 font-display font-black text-white">{row.racePoints}</p></div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-2"><p className="text-[8px] font-black uppercase text-zinc-500">Season</p><p className="mt-1 font-display font-black text-yellow-300">{row.seasonPoints}</p></div>
            </div>
          </div>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 p-4 sm:p-5">
          <label className="block sm:max-w-sm">
            <span className="mb-2 block text-xs font-bold text-zinc-300">Search demo users</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search username" />
            </span>
          </label>
        </div>

        <div className="divide-y divide-white/10 md:hidden">
          {visibleRows.map((row) => (
            <div key={row.position} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white font-display font-black text-black">{row.position}</span>
                <UserInitial name={row.name} />
                <p className="min-w-0 truncate font-bold text-white">{row.name}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-zinc-500">Correct answers</dt><dd className="mt-1 font-bold text-white">{row.correctAnswers}/{maximumPoints}</dd></div>
                <div><dt className="text-zinc-500">Race points</dt><dd className="mt-1 font-bold text-white">{row.racePoints}</dd></div>
                <div><dt className="text-zinc-500">Season points after</dt><dd className="mt-1 font-bold text-yellow-300">{row.seasonPoints}</dd></div>
                <div><dt className="text-zinc-500">Submission time</dt><dd className="mt-1 font-bold text-zinc-300">{row.submissionTime ?? 'Not recorded'}</dd></div>
              </dl>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-black/35 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
              <tr><th className="px-5 py-3.5">Position</th><th className="px-4 py-3.5">User</th><th className="px-4 py-3.5">Correct Answers</th><th className="px-4 py-3.5">Race Points</th><th className="px-4 py-3.5">Season Points After</th><th className="px-5 py-3.5">Submission Time</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {visibleRows.map((row) => (
                <tr key={row.position} className="hover:bg-white/[0.025]">
                  <td className="px-5 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-display font-black text-black">{row.position}</span></td>
                  <td className="px-4 py-4"><div className="flex items-center gap-3"><UserInitial name={row.name} /><span className="font-bold text-white">{row.name}</span></div></td>
                  <td className="px-4 py-4 font-bold text-zinc-200">{row.correctAnswers}/{maximumPoints}</td>
                  <td className="px-4 py-4 font-display text-base font-black text-zinc-200">{row.racePoints}</td>
                  <td className="px-4 py-4 font-display text-base font-black text-yellow-300">{row.seasonPoints}</td>
                  <td className="px-5 py-4 text-zinc-400">{row.submissionTime ?? 'Not recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!visibleRows.length && <div className="p-5"><EmptyNotice>No demo users match this search.</EmptyNotice></div>}
        {!search && rows.length > 10 && (
          <div className="border-t border-white/10 p-4 text-center">
            <button type="button" onClick={() => setShowAll((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
              {showAll ? 'Show Top 10' : 'See More'}
              <ChevronDown className={`h-4 w-4 transition ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function RaceStatistics({ result, rows, maximumPoints }) {
  if (!result || !rows.length || !result.submissionCount || !result.totalScoredSubmissions) {
    return <EmptyNotice>Statistics are not available for this race.</EmptyNotice>;
  }

  const counts = rows.map((row) => row.correctAnswers);
  const average = counts.reduce((total, count) => total + count, 0) / counts.length;
  const highest = Math.max(...counts);
  const lowest = Math.min(...counts);
  const maximumCount = counts.filter((count) => count === maximumPoints).length;
  const completionRate = Math.round((result.totalScoredSubmissions / result.submissionCount) * 100);
  const availableStatistics = [
    ['Total submissions', result.submissionCount],
    ['Total scored submissions', result.totalScoredSubmissions],
    ['Average correct answers', average.toFixed(1)],
    ['Highest correct-answer count', highest],
    ['Lowest correct-answer count', lowest],
    ['Users with maximum points', maximumCount],
    ['Prediction completion rate', `${completionRate}%`],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-black uppercase text-white">Available Race Statistics</h3>
        <p className="mt-1 text-sm text-zinc-500">Calculated only from the complete demonstration leaderboard for this race.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {availableStatistics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 font-display text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Question-level statistics</p>
        <p className="mt-2 text-sm text-zinc-400">Statistics are not available for this race.</p>
        <p className="mt-1 text-xs text-zinc-600">Per-question prediction records are not present, so the easiest and most difficult questions are not inferred.</p>
      </div>
    </div>
  );
}

function HistoryDetail({ race, questions, result, leaderboard, onBack }) {
  const [activeTab, setActiveTab] = useState('answers');
  const raceId = getRaceStableId(race);
  const scoringStatus = scoringStatusFor(race, result);
  const leaderboardStatus = leaderboardStatusFor(result);
  const maximumPoints = questions.reduce((total, question) => total + Number(question.points || 0), 0);

  const handleTabKeyDown = (event, currentTab) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    document.getElementById(`history-tab-${tabs[nextIndex].id}`)?.focus();
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Race History
      </button>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/10 bg-[linear-gradient(115deg,rgba(250,204,21,0.12),transparent_48%)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DemoLabel />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300"><LockKeyhole className="h-3 w-3 text-yellow-400" aria-hidden="true" /> Read-only history</span>
                <WeekendBadge sprintWeekend={race.sprintWeekend} />
              </div>
              <h2 className="mt-4 font-display text-3xl font-black uppercase text-white sm:text-4xl">{race.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">{race.circuit} - Round {race.round} - Season {race.season}</p>
            </div>
            <div className="rounded-xl border border-yellow-400/20 bg-black/35 p-4 text-sm text-yellow-100 lg:max-w-sm">
              <p className="font-bold">Prototype history record</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">Answers and leaderboard entries shown here are fictional Demo Data, not official race results.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-4">
          <Metric label="Circuit" value={race.circuit} icon={Flag} />
          <Metric label="Round" value={`Round ${race.round}`} icon={Gauge} />
          <Metric label="Season" value={race.season} icon={CalendarDays} />
          <Metric label="Race date" value={formatDate(race.raceStart)} icon={CalendarDays} />
          <Metric label="Weekend format" value={race.sprintWeekend ? 'SPRINT WEEKEND' : 'Normal Race'} icon={Zap} />
          <Metric label="Predictions opened" value={race.opensAt ?? 'Not available'} icon={Clock3} />
          <Metric label="Predictions closed" value={race.closesAt ?? 'Not available'} icon={Clock3} />
          <Metric label="Total submissions" value={result?.submissionCount ?? 'Not available'} icon={Users} />
          <Metric label="Total questions" value={questions.length} icon={CircleHelp} />
          <Metric label="Maximum points" value={maximumPoints} icon={Trophy} />
          <Metric label="Scoring status" value={scoringStatus} icon={CheckCircle2} />
          <Metric label="Leaderboard publication" value={leaderboardStatus} icon={Trophy} />
        </div>
      </Panel>

      <div className="overflow-x-auto pb-1">
        <div role="tablist" aria-label={`${race.name} history sections`} className="inline-flex min-w-full gap-2 rounded-2xl border border-white/10 bg-[#111113] p-2 sm:min-w-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              id={`history-tab-${id}`}
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`history-panel-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              onClick={() => setActiveTab(id)}
              onKeyDown={(event) => handleTabKeyDown(event, id)}
              className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition focus:outline-none focus:ring-2 focus:ring-yellow-400/50 ${activeTab === id ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      <section id={`history-panel-${activeTab}`} role="tabpanel" aria-labelledby={`history-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
        {activeTab === 'answers' && <CorrectAnswers questions={questions} result={result} race={race} />}
        {activeTab === 'leaderboard' && <RaceLeaderboard key={raceId} rows={leaderboard} published={leaderboardStatus === 'Published'} maximumPoints={maximumPoints} />}
        {activeTab === 'statistics' && <RaceStatistics result={result} rows={leaderboard} maximumPoints={maximumPoints} />}
      </section>
    </div>
  );
}

export default function RaceHistoryScreen({ races, questionsByRaceId }) {
  const [historySelectedRaceId, setHistorySelectedRaceId] = useState(null);
  const [season, setSeason] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sprintFilter, setSprintFilter] = useState('All');

  const completedRaces = useMemo(
    () => races
      .filter((race) => completedStatuses.has(race.status))
      .sort((first, second) => new Date(second.raceStart) - new Date(first.raceStart)),
    [races]
  );
  const seasons = useMemo(
    () => [...new Set(completedRaces.map((race) => String(race.season)))].sort((a, b) => b.localeCompare(a)),
    [completedRaces]
  );
  const filteredRaces = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return completedRaces.filter((race) => {
      const raceId = getRaceStableId(race);
      const result = demoResultsByRaceId[raceId];
      const scoringStatus = scoringStatusFor(race, result);
      const matchesSeason = season === 'All' || String(race.season) === season;
      const matchesStatus = statusFilter === 'All' || scoringStatus === statusFilter;
      const matchesSprint = sprintFilter === 'All'
        || (sprintFilter === 'Sprint' ? race.sprintWeekend : !race.sprintWeekend);
      const searchable = `${race.name} ${race.circuit} ${race.country} ${race.round} round ${race.round}`.toLowerCase();
      return matchesSeason && matchesStatus && matchesSprint && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [completedRaces, search, season, sprintFilter, statusFilter]);

  const selectedRace = completedRaces.find((race) => getRaceStableId(race) === historySelectedRaceId) ?? null;
  if (selectedRace) {
    const selectedId = getRaceStableId(selectedRace);
    return (
      <HistoryDetail
        key={selectedId}
        race={selectedRace}
        questions={questionsByRaceId[selectedId] ?? []}
        result={demoResultsByRaceId[selectedId]}
        leaderboard={demoLeaderboardByRaceId[selectedId] ?? []}
        onBack={() => setHistorySelectedRaceId(null)}
      />
    );
  }

  const mostRecentCompletedRace = completedRaces.find((race) => scoringStatusFor(race, demoResultsByRaceId[getRaceStableId(race)]) !== 'Results Pending');
  const filtersActive = Boolean(search || season !== 'All' || statusFilter !== 'All' || sprintFilter !== 'All');

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="READ-ONLY HISTORY"
        title="Race History"
        description="Review correct answers, scoring summaries and leaderboard results from completed races."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <DemoLabel />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300"><LockKeyhole className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" /> Read only</span>
          </div>
        )}
      />

      <Panel className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-bold text-zinc-200">
            <span className="mb-2 block">Season</span>
            <select value={season} onChange={(event) => setSeason(event.target.value)} className={inputClass}>
              <option value="All">All seasons</option>
              {seasons.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-zinc-200">
            <span className="mb-2 block">Search races</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Grand Prix, circuit, country, round" />
            </span>
          </label>
          <label className="text-sm font-bold text-zinc-200">
            <span className="mb-2 block">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
              <option value="All">All completed statuses</option>
              <option value="Results Pending">Results Pending</option>
              <option value="Scored">Scored</option>
              <option value="Published">Published</option>
            </select>
          </label>
          <label className="text-sm font-bold text-zinc-200">
            <span className="mb-2 block">Weekend format</span>
            <select value={sprintFilter} onChange={(event) => setSprintFilter(event.target.value)} className={inputClass}>
              <option value="All">Normal and Sprint</option>
              <option value="Normal">Normal Race</option>
              <option value="Sprint">Sprint Weekend</option>
            </select>
          </label>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-zinc-500">Total completed races</p>
              <p className="mt-3 font-display text-4xl font-black text-white">{completedRaces.length}</p>
              <p className="mt-1 text-xs text-zinc-500">Closed, scored or published records</p>
            </div>
            <span className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-yellow-300"><History className="h-5 w-5" aria-hidden="true" /></span>
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-bold text-zinc-500">Most recent completed race</p>
          {mostRecentCompletedRace ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-display text-xl font-black uppercase text-white">{mostRecentCompletedRace.name}</p>
                <p className="mt-1 text-xs text-zinc-500">Round {mostRecentCompletedRace.round} - {formatDate(mostRecentCompletedRace.raceStart)}</p>
              </div>
              <HistoryStatusBadge status={scoringStatusFor(mostRecentCompletedRace, demoResultsByRaceId[getRaceStableId(mostRecentCompletedRace)])} />
            </div>
          ) : <p className="mt-3 text-sm text-zinc-500">No scored race is available.</p>}
        </Panel>
      </div>

      {!completedRaces.length ? <EmptyHistory filtered={false} /> : !filteredRaces.length ? <EmptyHistory filtered={filtersActive} /> : (
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Completed race archive</p>
              <h3 className="mt-1 font-display text-xl font-black uppercase text-white">Previous Race Results</h3>
            </div>
            <p className="text-xs text-zinc-500">Most recent first</p>
          </div>

          <div className="divide-y divide-white/10 lg:hidden">
            {filteredRaces.map((race) => {
              const raceId = getRaceStableId(race);
              const result = demoResultsByRaceId[raceId];
              const questionCount = questionsByRaceId[raceId]?.length ?? race.questions;
              return (
                <article key={raceId} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-yellow-400">Round {race.round} - {race.country}</p>
                      <h4 className="mt-1 font-display text-lg font-black uppercase text-white">{race.name}</h4>
                      <p className="mt-1 text-xs text-zinc-500">{race.circuit}</p>
                    </div>
                    <WeekendBadge sprintWeekend={race.sprintWeekend} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div><dt className="text-zinc-500">Race date</dt><dd className="mt-1 font-bold text-zinc-200">{formatDate(race.raceStart)}</dd></div>
                    <div><dt className="text-zinc-500">Questions</dt><dd className="mt-1 font-bold text-zinc-200">{questionCount}</dd></div>
                    <div><dt className="text-zinc-500">Submissions</dt><dd className="mt-1 font-bold text-zinc-200">{result?.submissionCount ?? 'Not available'}</dd></div>
                    <div><dt className="mb-1.5 text-zinc-500">Scoring</dt><dd><HistoryStatusBadge status={scoringStatusFor(race, result)} /></dd></div>
                    <div><dt className="mb-1.5 text-zinc-500">Leaderboard</dt><dd><HistoryStatusBadge status={leaderboardStatusFor(result)} /></dd></div>
                  </dl>
                  <button type="button" onClick={() => setHistorySelectedRaceId(raceId)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:ring-offset-2 focus:ring-offset-[#111113]">
                    View Results
                  </button>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-black/35 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">
                <tr><th className="px-5 py-3.5">Round</th><th className="px-4 py-3.5">Grand Prix</th><th className="px-4 py-3.5">Circuit / Country</th><th className="px-4 py-3.5">Race Date</th><th className="px-4 py-3.5">Format</th><th className="px-4 py-3.5">Questions</th><th className="px-4 py-3.5">Submissions</th><th className="px-4 py-3.5">Scoring</th><th className="px-4 py-3.5">Leaderboard</th><th className="px-5 py-3.5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredRaces.map((race) => {
                  const raceId = getRaceStableId(race);
                  const result = demoResultsByRaceId[raceId];
                  const questionCount = questionsByRaceId[raceId]?.length ?? race.questions;
                  return (
                    <tr key={raceId} className="hover:bg-white/[0.025]">
                      <td className="px-5 py-4 font-display text-lg font-black text-yellow-300">{race.round}</td>
                      <td className="px-4 py-4"><p className="font-bold text-white">{race.name}</p><p className="mt-1 text-xs text-zinc-600">Season {race.season}</p></td>
                      <td className="px-4 py-4"><p className="text-zinc-300">{race.circuit}</p><p className="mt-1 text-xs text-zinc-600">{race.country}</p></td>
                      <td className="px-4 py-4 text-zinc-300">{formatDate(race.raceStart)}</td>
                      <td className="px-4 py-4"><WeekendBadge sprintWeekend={race.sprintWeekend} /></td>
                      <td className="px-4 py-4 font-bold text-zinc-300">{questionCount}</td>
                      <td className="px-4 py-4 font-bold text-zinc-300">{result?.submissionCount ?? 'Not available'}</td>
                      <td className="px-4 py-4"><HistoryStatusBadge status={scoringStatusFor(race, result)} /></td>
                      <td className="px-4 py-4"><HistoryStatusBadge status={leaderboardStatusFor(result)} /></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setHistorySelectedRaceId(raceId)} className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300 transition hover:bg-yellow-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-yellow-400/50">View Results</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
