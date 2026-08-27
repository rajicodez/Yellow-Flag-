import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, BarChart3, Clock3, Crown, Gauge, LoaderCircle, PencilLine,
  RefreshCw, Sparkles, Target, Trophy, Users,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminRaceSelect from '../AdminRaceSelect';
import { EmptyNotice, Panel, ScreenHeading, StatusBadge } from '../AdminUI';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo',
});

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function MetricCard({ icon: Icon, label, value, detail, tone = 'yellow' }) {
  const tones = {
    yellow: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300',
    blue: 'border-blue-400/25 bg-blue-400/10 text-blue-300',
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
  };
  return (
    <Panel className="overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-500">{label}</p>
          <p className="mt-3 truncate font-display text-3xl font-black uppercase text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{detail}</p>
        </div>
        <span className={`rounded-xl border p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      </div>
    </Panel>
  );
}

function ChoiceBar({ choice, total, index }) {
  const percentage = total ? (Number(choice.count) / total) * 100 : 0;
  return (
    <div className="group">
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${index === 0 ? 'bg-yellow-400 text-black' : 'bg-white/5 text-zinc-500'}`}>{index + 1}</span>
          <span className="truncate font-semibold text-zinc-200">{choice.label}</span>
        </div>
        <span className="shrink-0 font-display font-black text-white">{percentage.toFixed(1)}% <span className="ml-1 text-[10px] text-zinc-600">{choice.count}</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full transition-all duration-700 ${index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.25)]' : 'bg-zinc-600 group-hover:bg-zinc-500'}`} style={{ width: `${Math.max(percentage, percentage > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  );
}

function TimelineChart({ points }) {
  const maximum = Math.max(1, ...points.map((point) => Number(point.submissions) + Number(point.edits)));
  if (!points.length) return <EmptyNotice>No submission activity has been recorded for this race.</EmptyNotice>;
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-yellow-400" /> Submissions</span>
        <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-violet-400" /> Edits</span>
      </div>
      <div className="flex h-52 items-end gap-2 overflow-x-auto border-b border-white/10 pb-7">
        {points.map((point) => {
          const submissions = Number(point.submissions);
          const edits = Number(point.edits);
          const total = submissions + edits;
          return (
            <div key={point.time} title={`${timeFormatter.format(new Date(point.time))}: ${submissions} submissions, ${edits} edits`} className="group relative flex h-full min-w-9 flex-1 items-end justify-center">
              <div className="relative flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-t-md bg-white/[0.04] transition group-hover:bg-white/[0.08]" style={{ height: `${Math.max((total / maximum) * 100, total ? 5 : 0)}%` }}>
                {edits > 0 && <div className="w-full bg-violet-400" style={{ height: `${(edits / total) * 100}%` }} />}
                {submissions > 0 && <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300" style={{ height: `${(submissions / total) * 100}%` }} />}
              </div>
              <span className="absolute -bottom-6 whitespace-nowrap text-[8px] font-bold text-zinc-600 opacity-0 group-hover:opacity-100">{new Date(point.time).getHours().toString().padStart(2, '0')}:00</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionPanel({ question }) {
  const choices = question.choices ?? [];
  const total = choices.reduce((sum, choice) => sum + Number(choice.count), 0);
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(250,204,21,0.08),transparent_48%)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 font-display text-sm font-black text-yellow-300">{question.question_number}</span>
          <div><h3 className="font-display text-lg font-black uppercase leading-tight text-white">{question.question_text}</h3><p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">{total} predictions · {question.answer_type}</p></div>
        </div>
      </div>
      <div className="space-y-5 p-5">
        {choices.slice(0, 6).map((choice, index) => <ChoiceBar key={choice.value} choice={choice} total={total} index={index} />)}
        {!choices.length && <p className="py-4 text-center text-sm text-zinc-500">No answers submitted yet.</p>}
      </div>
    </Panel>
  );
}

function ScoreDistribution({ scoring }) {
  const distribution = scoring?.distribution ?? [];
  const maximum = Math.max(1, ...distribution.map((item) => Number(item.count)));
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-yellow-400" /><div><h3 className="font-display text-xl font-black uppercase text-white">Score Distribution</h3><p className="text-xs text-zinc-500">Fan results after scoring</p></div></div>
      {!scoring?.available ? <div className="mt-5"><EmptyNotice>Score analytics will appear after official answers are calculated.</EmptyNotice></div> : (
        <div className="mt-7">
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="text-xs text-zinc-500">Average score</p><p className="mt-1 font-display text-3xl font-black text-white">{scoring.average_score}<span className="text-sm text-zinc-600">/7</span></p></div>
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] p-4"><p className="text-xs text-zinc-500">Perfect predictions</p><p className="mt-1 font-display text-3xl font-black text-yellow-300">{scoring.perfect_scores}</p></div>
          </div>
          <div className="flex h-40 items-end gap-2">
            {distribution.map((item) => <div key={item.score} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-black text-zinc-500">{item.count}</span><div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-yellow-600 to-yellow-300" style={{ height: `${Math.max((Number(item.count) / maximum) * 100, item.count ? 7 : 0)}%` }} /><span className="font-display text-xs font-black text-zinc-400">{item.score}</span></div>)}
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function AnalyticsScreen({ races, questionsByRaceId, selectedRace, selectedRaceId, setSelectedRaceId }) {
  const [competition, setCompetition] = useState('user');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const refreshTimer = useRef(null);

  const loadAnalytics = useCallback(async ({ quiet = false } = {}) => {
    if (!selectedRace?.id || !supabase) {
      setAnalytics(null);
      setLoading(false);
      return;
    }
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_prediction_analytics', {
        p_race_id: selectedRace.id,
        p_competition: competition,
      });
      if (rpcError) throw rpcError;
      setAnalytics(data);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load prediction analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competition, selectedRace?.id]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  useEffect(() => {
    if (!supabase || !selectedRace?.id) return undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => loadAnalytics({ quiet: true }), 500);
    };
    const channel = supabase
      .channel(`admin-analytics-${selectedRace.id}-${competition}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prediction_analytics_events', filter: `race_id=eq.${selectedRace.id}` }, scheduleRefresh)
      .subscribe();
    const polling = window.setInterval(() => loadAnalytics({ quiet: true }), 30_000);
    return () => {
      window.clearTimeout(refreshTimer.current);
      window.clearInterval(polling);
      supabase.removeChannel(channel);
    };
  }, [competition, loadAnalytics, selectedRace?.id]);

  const totals = analytics?.totals ?? {};
  const questions = analytics?.questions ?? [];
  const winnerQuestion = questions.find((question) => question.question_key === 'race_winner');
  const mostPredictedWinner = winnerQuestion?.choices?.[0]?.label ?? 'Hidden until close';
  const generatedAt = analytics?.generated_at ? timeFormatter.format(new Date(analytics.generated_at)) : '—';
  const metrics = useMemo(() => [
    { icon: Users, label: competition === 'user' ? 'Fan Predictions' : 'Host Predictions', value: compactNumber.format(Number(totals.entries ?? 0)), detail: `${totals.participation_rate ?? 0}% of registered accounts`, tone: 'yellow' },
    { icon: Activity, label: 'Last Hour Activity', value: totals.activity_last_hour ?? 0, detail: 'Submissions and prediction edits', tone: 'emerald' },
    { icon: PencilLine, label: 'Prediction Edits', value: totals.edits ?? 0, detail: 'Changes recorded after initial submission', tone: 'violet' },
    { icon: Crown, label: 'Most Predicted Winner', value: analytics?.distributions_locked ? 'Locked' : mostPredictedWinner, detail: analytics?.distributions_locked ? 'Revealed after predictions close' : 'Current fan consensus', tone: 'blue' },
  ], [analytics?.distributions_locked, competition, mostPredictedWinner, totals]);

  return (
    <div className="space-y-7">
      <ScreenHeading eyebrow="Fan Intelligence" title="Prediction Analytics" description="Real-time, privacy-preserving insight into participation, fan sentiment, and prediction performance." action={<button type="button" onClick={() => loadAnalytics({ quiet: true })} disabled={refreshing || !selectedRace} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>} />

      <Panel className="overflow-visible p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <AdminRaceSelect races={races} questionsByRaceId={questionsByRaceId} value={selectedRaceId} onChange={setSelectedRaceId} label="Race" />
          <div><p className="mb-2 text-sm font-bold text-zinc-200">Competition</p><div className="flex rounded-xl border border-white/10 bg-black/30 p-1">{[['user', 'Fans'], ['host', 'Hosts']].map(([value, label]) => <button key={value} type="button" onClick={() => setCompetition(value)} className={`rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-[0.13em] transition ${competition === value ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'}`}>{label}</button>)}</div></div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" /> Live Data</div><p className="mt-1 text-[10px] text-zinc-500">Updated {generatedAt}</p></div>
        </div>
      </Panel>

      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}
      {loading ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading live analytics...</div> : !selectedRace ? <EmptyNotice>Create or select a race to view prediction analytics.</EmptyNotice> : analytics && <>
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={selectedRace.status} /><p className="text-sm font-semibold text-white">{selectedRace.name}</p><span className="text-xs text-zinc-600">Predictions close {timeFormatter.format(new Date(analytics.race.closes_at))}</span></div>
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <Panel className="p-5 sm:p-6"><div className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-yellow-400" /><div><h3 className="font-display text-xl font-black uppercase text-white">Submission Pace</h3><p className="text-xs text-zinc-500">Hourly activity throughout the prediction window</p></div></div><Clock3 className="h-5 w-5 text-zinc-700" /></div><TimelineChart points={analytics.timeline ?? []} /></Panel>
          <Panel className="overflow-hidden"><div className="border-b border-white/10 px-5 py-4"><div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-yellow-400" /><div><h3 className="font-display text-xl font-black uppercase text-white">Host Readiness</h3><p className="text-xs text-zinc-500">Submission status for Lakindu and Kasun</p></div></div></div><div className="p-5"><div className="flex items-end justify-between"><p className="font-display text-5xl font-black text-white">{totals.submitted_hosts ?? 0}<span className="text-xl text-zinc-600">/{totals.expected_hosts ?? 2}</span></p><Target className="h-10 w-10 text-yellow-400/60" /></div><div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-emerald-400" style={{ width: `${Math.min(100, (Number(totals.submitted_hosts ?? 0) / Math.max(1, Number(totals.expected_hosts ?? 2))) * 100)}%` }} /></div><p className="mt-4 text-xs leading-5 text-zinc-500">Host predictions remain a separate competition and never affect fan analytics.</p></div></Panel>
        </div>

        {analytics.distributions_locked ? <Panel className="relative overflow-hidden p-8 text-center sm:p-12"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.13),transparent_65%)]" /><div className="relative"><Sparkles className="mx-auto h-10 w-10 text-violet-300" /><h3 className="mt-4 font-display text-2xl font-black uppercase text-white">Fan Choices Stay Hidden Until Lock</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">Participation and activity remain live. Driver, constructor, and podium distributions unlock automatically when predictions close, preventing them from influencing the hosts.</p></div></Panel> : <>
          <div><p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-400">Fan Sentiment</p><h3 className="mt-2 font-display text-3xl font-black uppercase text-white">Question Breakdown</h3></div>
          <div className="grid gap-5 xl:grid-cols-2">{questions.map((question) => <QuestionPanel key={question.question_id} question={question} />)}</div>
          <Panel className="overflow-hidden"><div className="border-b border-white/10 bg-[linear-gradient(120deg,rgba(250,204,21,0.08),transparent_55%)] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><Crown className="h-5 w-5 text-yellow-400" /><div><h3 className="font-display text-xl font-black uppercase text-white">Popular Podium Combinations</h3><p className="text-xs text-zinc-500">The five most common P1, P2 and P3 combinations</p></div></div></div><div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-2">{(analytics.podium_combinations ?? []).map((podium, index) => <div key={`${podium.p1}-${podium.p2}-${podium.p3}`} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/25 p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-black ${index === 0 ? 'bg-yellow-400 text-black' : 'bg-white/5 text-zinc-400'}`}>{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{podium.p1}</p><p className="truncate text-xs text-zinc-500">{podium.p2} · {podium.p3}</p></div><span className="font-display text-2xl font-black text-yellow-300">{podium.count}</span></div>)}{!(analytics.podium_combinations ?? []).length && <div className="lg:col-span-2"><EmptyNotice>No complete podium combinations yet.</EmptyNotice></div>}</div></Panel>
        </>}

        <ScoreDistribution scoring={analytics.scoring} />
      </>}
    </div>
  );
}
