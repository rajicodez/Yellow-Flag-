import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock, CheckCircle2, CircleHelp, Flag, Gauge, History, Pencil, Timer, Users,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import RaceFormModal from '../RaceFormModal';
import { EmptyNotice, Modal, Panel, ScreenHeading, StatusBadge } from '../AdminUI';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo',
});
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelativeTime(value) {
  const elapsedSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const ranges = [['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3_600], ['minute', 60]];
  for (const [unit, seconds] of ranges) {
    if (Math.abs(elapsedSeconds) >= seconds) return relativeTimeFormatter.format(Math.round(elapsedSeconds / seconds), unit);
  }
  return 'just now';
}

function formatCountdown(value) {
  const remainingMinutes = Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 60_000));
  const days = Math.floor(remainingMinutes / 1_440);
  const hours = Math.floor((remainingMinutes % 1_440) / 60);
  const minutes = remainingMinutes % 60;
  return `${String(days).padStart(2, '0')}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M`;
}

function useDashboardData(raceId) {
  const [data, setData] = useState({ registeredUsers: 0, submittedPredictions: 0, activity: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const predictionCountQuery = raceId
        ? supabase.from('prediction_entries').select('id', { count: 'exact', head: true }).eq('race_id', raceId)
        : Promise.resolve({ count: 0, error: null });
      const [profilesResult, predictionsResult, activityResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        predictionCountQuery,
        supabase.from('prediction_entries').select('id, user_id, competition, submitted_at, races(race_name)').order('submitted_at', { ascending: false }).limit(5),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (predictionsResult.error) throw predictionsResult.error;
      if (activityResult.error) throw activityResult.error;

      const userIds = [...new Set((activityResult.data ?? []).map((entry) => entry.user_id))];
      const profilesById = new Map();
      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
        if (profileError) throw profileError;
        for (const profile of profileRows ?? []) profilesById.set(profile.id, profile.display_name);
      }
      setData({
        registeredUsers: profilesResult.count ?? 0,
        submittedPredictions: predictionsResult.count ?? 0,
        activity: (activityResult.data ?? []).map((entry) => ({
          id: entry.id,
          title: `${profilesById.get(entry.user_id) ?? 'A user'} submitted ${entry.competition === 'host' ? 'a host prediction' : 'a prediction'}`,
          detail: `${entry.races?.race_name ?? 'Unknown race'} · ${formatRelativeTime(entry.submitted_at)}`,
        })),
      });
    } catch (dashboardError) {
      setError(dashboardError.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...data, loading, error, refresh };
}

export default function DashboardScreen({ races, selectedRace, saveRace, sprintWeekend, onNavigate }) {
  const [raceModalOpen, setRaceModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const currentRace = selectedRace ?? races.find((race) => race.status === 'Open') ?? races[0] ?? null;
  const dashboard = useDashboardData(currentRace?.id);
  const { maximumPoints, totalQuestions } = sprintWeekend;

  const summaryCards = useMemo(() => [
    { label: 'Registered Users', value: dashboard.loading ? '—' : dashboard.registeredUsers, detail: 'Accounts with Yellow Flag profiles', icon: Users, color: 'text-blue-300 bg-blue-400/10 border-blue-400/20' },
    { label: 'Submitted Predictions', value: dashboard.loading ? '—' : dashboard.submittedPredictions, detail: currentRace?.name ?? 'No race selected', icon: CheckCircle2, color: 'text-violet-300 bg-violet-400/10 border-violet-400/20' },
    { label: 'Current Race', value: currentRace?.name ?? 'None', detail: currentRace ? `Round ${currentRace.round} · ${currentRace.circuit}` : 'Create a race to begin', icon: Flag, color: 'text-red-300 bg-red-400/10 border-red-400/20' },
    { label: 'Predictions Status', value: currentRace?.status ?? 'Unavailable', detail: currentRace ? `Closes ${currentRace.closesAt}` : 'No prediction window', icon: Gauge, color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  ], [currentRace, dashboard.loading, dashboard.registeredUsers, dashboard.submittedPredictions]);

  const handleSaveRace = async ({ race, isEditing }) => {
    setSaving(true);
    setActionError('');
    try {
      await saveRace(race, isEditing);
      setRaceModalOpen(false);
      setNotice(`${race.name} updated in Supabase.`);
    } finally {
      setSaving(false);
    }
  };

  const closePredictions = async () => {
    if (!currentRace) return;
    setSaving(true);
    setActionError('');
    try {
      await saveRace({ ...currentRace, status: 'Closed' }, true);
      setCloseModalOpen(false);
      setNotice(`Predictions for ${currentRace.name} are now closed.`);
      await dashboard.refresh();
    } catch (closeError) {
      setActionError(closeError.message || 'Unable to close predictions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <ScreenHeading eyebrow="Race Operations" title="Control Overview" description="Live race, account, and prediction information from Supabase." />

      {(dashboard.error || actionError) && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{actionError || dashboard.error}</div>}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-4 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">
          <span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice" className="text-yellow-400 hover:text-white">×</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map(({ label, value, detail, icon: Icon, color }) => (
          <Panel key={label} className="p-5"><div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-xs font-bold text-zinc-500">{label}</p><p className="mt-3 truncate font-display text-3xl font-black uppercase text-white">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>
            <span className={`rounded-xl border p-2.5 ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
          </div></Panel>
        ))}
      </div>

      {!currentRace ? <EmptyNotice>No races are available yet. Create one from Race Management.</EmptyNotice> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
          <Panel className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-[linear-gradient(115deg,rgba(250,204,21,0.11),transparent_45%)] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div><div className="mb-3"><StatusBadge status={currentRace.status} /></div><h3 className="font-display text-2xl font-black uppercase text-white sm:text-3xl">{currentRace.name}</h3><p className="mt-1 text-sm text-zinc-400">{currentRace.circuit} · Round {currentRace.round}</p></div>
              <div className="rounded-xl border border-yellow-400/20 bg-black/30 px-4 py-3 text-left sm:text-right"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Time until FP1 lock</p><p className="mt-1 font-display text-xl font-black tracking-[0.12em] text-yellow-300">{formatCountdown(`${currentRace.predictionCloses}:00+05:30`)}</p></div>
            </div>

            <div className="grid gap-px bg-white/10 sm:grid-cols-2">
              <div className="flex items-start gap-3 bg-[#111113] p-5 sm:p-6"><CalendarClock className="mt-0.5 h-5 w-5 text-yellow-400" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Predictions Open</p><p className="mt-1 text-sm font-semibold text-white">{dateTimeFormatter.format(new Date(`${currentRace.predictionOpens}:00+05:30`))}</p></div></div>
              <div className="flex items-start gap-3 bg-[#111113] p-5 sm:p-6"><Timer className="mt-0.5 h-5 w-5 text-red-400" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Predictions Close at FP1</p><p className="mt-1 text-sm font-semibold text-white">{dateTimeFormatter.format(new Date(`${currentRace.predictionCloses}:00+05:30`))}</p></div></div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4"><CircleHelp className="h-5 w-5 text-yellow-400" aria-hidden="true" /><div><p className="font-display text-xl font-black text-white">{totalQuestions}</p><p className="text-xs text-zinc-500">Active questions</p></div></div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4"><Gauge className="h-5 w-5 text-yellow-400" aria-hidden="true" /><div><p className="font-display text-xl font-black text-white">{maximumPoints}</p><p className="text-xs text-zinc-500">Maximum points</p></div></div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="button" onClick={() => setRaceModalOpen(true)} disabled={['Scored', 'Published'].includes(currentRace.status)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:cursor-not-allowed disabled:opacity-40"><Pencil className="h-4 w-4" aria-hidden="true" /> Edit Race</button>
                <button type="button" onClick={() => setCloseModalOpen(true)} disabled={currentRace.status !== 'Open'} className="rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-red-300 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-40">Close Predictions</button>
                <button type="button" onClick={() => onNavigate('raceHistory')} className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-yellow-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/15 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"><History className="h-4 w-4" aria-hidden="true" /> View Previous Results</button>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Live Feed</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">Recent Submissions</h3></div><span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div>
            {dashboard.activity.length ? <ul className="divide-y divide-white/10">{dashboard.activity.map((item, index) => <li key={item.id} className="flex gap-3 px-5 py-4"><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-[9px] font-black text-yellow-300">{index + 1}</span><div><p className="text-sm font-semibold text-zinc-200">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.detail}</p></div></li>)}</ul> : <div className="p-5"><EmptyNotice>{dashboard.loading ? 'Loading recent submissions...' : 'No predictions have been submitted yet.'}</EmptyNotice></div>}
          </Panel>
        </div>
      )}

      <RaceFormModal race={currentRace} races={races} open={raceModalOpen} onClose={() => setRaceModalOpen(false)} onSave={handleSaveRace} />
      <Modal open={closeModalOpen} onClose={() => !saving && setCloseModalOpen(false)} title="Close Predictions?" description="This immediately prevents any new or updated entries for this race.">
        <p className="text-sm leading-6 text-zinc-300">Confirm that FP1 has begun for {currentRace?.name}. This action updates the live database.</p>
        {actionError && <p role="alert" className="mt-4 text-sm font-semibold text-red-300">{actionError}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={() => setCloseModalOpen(false)} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 disabled:opacity-50">Cancel</button><button type="button" disabled={saving} onClick={closePredictions} className="rounded-xl bg-red-500 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white disabled:cursor-wait disabled:opacity-60">{saving ? 'Closing...' : 'Close at FP1'}</button></div>
      </Modal>
    </div>
  );
}
