import { useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw, Trophy } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminRaceSelect from '../AdminRaceSelect';
import { Panel, ScreenHeading } from '../AdminUI';
import useAdminResults from '../useAdminResults';

export default function LeaderboardScreen() {
  const workspace = useAdminResults();
  const [mode, setMode] = useState('race');
  const [competition, setCompetition] = useState('user');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLeaderboard = async () => {
    if (!workspace.selectedRace) return;
    setLoading(true);
    setError('');

    try {
      const query = mode === 'race'
        ? supabase
            .from('race_prediction_leaderboard')
            .select('rank, entry_id, display_name, avatar_url, score, submitted_at')
            .eq('race_id', workspace.selectedRace.id)
            .eq('competition', competition)
            .order('rank', { ascending: true })
            .order('display_name', { ascending: true })
        : supabase
            .from('season_prediction_leaderboard')
            .select('rank, user_id, display_name, avatar_url, races_entered, total_score, score_7_count, score_6_count, score_5_count')
            .eq('season_year', workspace.selectedRace.season)
            .eq('competition', competition)
            .order('rank', { ascending: true })
            .order('display_name', { ascending: true });

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setRows(data ?? []);
    } catch (loadError) {
      setRows([]);
      setError(loadError.message || 'Unable to load the leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    // The selected race, mode, and competition fully define this query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition, mode, workspace.selectedRace?.id]);

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Championship Standings"
        title="Leaderboard"
        description="Published standings from the database. Fan and Host competitions are always ranked separately."
        action={(
          <button type="button" onClick={loadLeaderboard} disabled={loading || !workspace.selectedRace} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-zinc-200 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
      />

      {(workspace.error || error) && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{workspace.error || error}</div>}

      <Panel className="overflow-visible p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <AdminRaceSelect races={workspace.races} questionsByRaceId={workspace.questionsByRaceId} value={workspace.selectedRaceId} onChange={workspace.setSelectedRaceId} label={mode === 'race' ? 'Race' : 'Season Reference Race'} />
          <div>
            <p className="mb-2 text-sm font-bold text-zinc-200">Standings</p>
            <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
              {['race', 'season'].map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.13em] ${mode === item ? 'bg-yellow-400 text-black' : 'text-zinc-400'}`}>{item}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-zinc-200">Competition</p>
            <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
              {[['user', 'Fans'], ['host', 'Hosts']].map(([value, label]) => <button key={value} type="button" onClick={() => setCompetition(value)} className={`rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.13em] ${competition === value ? 'bg-yellow-400 text-black' : 'text-zinc-400'}`}>{label}</button>)}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <div>
            <p className="font-display text-lg font-black uppercase text-white">{mode === 'race' ? workspace.selectedRace?.name : `${workspace.selectedRace?.season ?? '—'} Season`} · {competition === 'user' ? 'Fans' : 'Hosts'}</p>
            <p className="text-xs text-zinc-500">Only published scores appear here.</p>
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 px-6 py-16 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading standings...</div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                <tr><th className="px-5 py-3">Rank</th><th className="px-5 py-3">Competitor</th><th className="px-5 py-3">{mode === 'race' ? 'Score' : 'Total'}</th>{mode === 'season' && <><th className="px-5 py-3">Races</th><th className="px-5 py-3">7/7</th><th className="px-5 py-3">6/7</th><th className="px-5 py-3">5/7</th></>}</tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => (
                  <tr key={row.entry_id ?? row.user_id} className="text-sm text-zinc-300">
                    <td className="px-5 py-4 font-display text-xl font-black text-yellow-300">{row.rank}</td>
                    <td className="px-5 py-4"><div className="flex items-center gap-3">{row.avatar_url ? <img src={row.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-black text-white">{row.display_name?.charAt(0) ?? '?'}</span>}<span className="font-bold text-white">{row.display_name}</span></div></td>
                    <td className="px-5 py-4 font-display text-xl font-black text-white">{mode === 'race' ? row.score : row.total_score}</td>
                    {mode === 'season' && <><td className="px-5 py-4">{row.races_entered}</td><td className="px-5 py-4">{row.score_7_count}</td><td className="px-5 py-4">{row.score_6_count}</td><td className="px-5 py-4">{row.score_5_count}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center"><p className="font-display text-xl font-black uppercase text-white">No Published Scores</p><p className="mt-2 text-sm text-zinc-500">Score and publish the selected race to populate this leaderboard.</p></div>
        )}
      </Panel>
    </div>
  );
}
