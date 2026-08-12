import { useMemo, useState } from 'react';
import { ChevronDown, Crown, Search, Trophy } from 'lucide-react';
import { DemoLabel, inputClass, Panel, ScreenHeading } from '../AdminUI';
import { leaderboardUsers } from '../data';

const podiumStyles = [
  'border-yellow-400/35 bg-[linear-gradient(145deg,rgba(250,204,21,0.18),rgba(17,17,19,0.95))] xl:order-2 xl:-translate-y-4',
  'border-zinc-300/25 bg-[linear-gradient(145deg,rgba(212,212,216,0.12),rgba(17,17,19,0.95))] xl:order-1',
  'border-amber-700/30 bg-[linear-gradient(145deg,rgba(180,83,9,0.13),rgba(17,17,19,0.95))] xl:order-3',
];

function UserInitial({ name, large = false }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 font-display font-black uppercase text-yellow-300 ${large ? 'h-14 w-14 text-base' : 'h-9 w-9 text-xs'}`}>{name.charAt(0)}</span>;
}

export default function LeaderboardScreen() {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(() => leaderboardUsers.filter((user) => user.name.toLowerCase().includes(search.toLowerCase())), [search]);
  const visible = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className="space-y-7">
      <ScreenHeading eyebrow="Championship Grid" title="Prediction Leaderboard" description="A standings-inspired overview using fictional sample accounts and demonstration points only." action={<DemoLabel>Demo Users</DemoLabel>} />

      <Panel className="p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-zinc-200"><span className="mb-2 block">Season</span><select className={inputClass} defaultValue="2026"><option>2026</option><option>2025</option></select></label>
          <label className="text-sm font-bold text-zinc-200"><span className="mb-2 block">Race</span><select className={inputClass} defaultValue="Dutch Grand Prix"><option>Dutch Grand Prix</option><option>Season Overall</option><option>Hungarian Grand Prix</option></select></label>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3 xl:items-end">
        {leaderboardUsers.slice(0, 3).map((user, index) => (
          <Panel key={user.position} className={`relative overflow-hidden p-5 text-center sm:p-6 ${podiumStyles[index]}`}>
            <div className="absolute right-4 top-4 font-display text-5xl font-black text-white/[0.05]">0{user.position}</div>
            {user.position === 1 && <Crown className="mx-auto mb-2 h-6 w-6 text-yellow-400" aria-hidden="true" />}
            <UserInitial name={user.name} large />
            <p className="mt-3 font-display text-xl font-black uppercase text-white">{user.name}</p>
            <p className="mt-1 text-xs text-zinc-500">Position {user.position}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Race</p><p className="mt-1 font-display text-xl font-black text-white">{user.racePoints}</p></div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Season</p><p className="mt-1 font-display text-xl font-black text-yellow-300">{user.seasonPoints}</p></div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Starting Grid</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">Top Predictions</h3></div>
          <div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search demo users" aria-label="Search leaderboard" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-black/35 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500"><tr><th className="px-5 py-3.5">Position</th><th className="px-4 py-3.5">User</th><th className="px-4 py-3.5">Race Points</th><th className="px-4 py-3.5">Season Points</th><th className="px-5 py-3.5">Predictions Submitted</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {visible.map((user) => <tr key={user.position} className="transition hover:bg-white/[0.025]"><td className="px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-center font-display text-base font-black text-black">{user.position}</span></td><td className="px-4 py-4"><div className="flex items-center gap-3"><UserInitial name={user.name} /><span className="font-bold text-white">{user.name}</span></div></td><td className="px-4 py-4 font-display text-lg font-black text-zinc-200">{user.racePoints}</td><td className="px-4 py-4 font-display text-lg font-black text-yellow-300">{user.seasonPoints}</td><td className="px-5 py-4 text-zinc-400">{user.submissions}</td></tr>)}
            </tbody>
          </table>
        </div>
        {!search && leaderboardUsers.length > 10 && <div className="border-t border-white/10 p-4 text-center"><button type="button" onClick={() => setShowAll((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">{showAll ? 'Show Top 10' : 'See More'}<ChevronDown className={`h-4 w-4 transition ${showAll ? 'rotate-180' : ''}`} aria-hidden="true" /></button></div>}
      </Panel>
    </div>
  );
}
