import { useMemo, useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Search } from 'lucide-react';
import RaceFormModal from '../RaceFormModal';
import { DemoLabel, EmptyNotice, inputClass, Panel, ScreenHeading, StatusBadge } from '../AdminUI';
import { demoRaces } from '../data';

export default function RacesScreen() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedRace, setSelectedRace] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const filteredRaces = useMemo(() => demoRaces.filter((race) => {
    const matchesSearch = `${race.name} ${race.circuit} ${race.country}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'All' || race.status === status);
  }), [search, status]);

  const openCreate = () => {
    setSelectedRace(null);
    setModalOpen(true);
  };

  const openEdit = (race) => {
    setSelectedRace(race);
    setModalOpen(true);
  };

  const handleDemoSave = (message) => {
    setModalOpen(false);
    setNotice(message);
  };

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Race Calendar"
        title="Race Management"
        description="Create, review, and prepare race prediction windows. Every row and action on this screen uses demonstration data."
        action={
          <button type="button" onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200">
            <Plus className="h-4 w-4" aria-hidden="true" /> Create Race
          </button>
        }
      />

      {notice && <div role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">{notice}</div>}

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search races or circuits" aria-label="Search races" />
          </div>
          <div className="flex items-center gap-3">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass} aria-label="Filter races by status">
              <option>All</option><option>Draft</option><option>Open</option><option>Closed</option><option>Scored</option>
            </select>
            <DemoLabel />
          </div>
        </div>

        {filteredRaces.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-black/35 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                <tr><th className="px-5 py-3.5">Race</th><th className="px-4 py-3.5">Round</th><th className="px-4 py-3.5">Opens</th><th className="px-4 py-3.5">Closes</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Questions</th><th className="px-5 py-3.5 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredRaces.map((race) => (
                  <tr key={race.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4"><p className="font-bold text-white">{race.name}</p><p className="mt-1 text-xs text-zinc-500">{race.circuit} · {race.country}</p></td>
                    <td className="px-4 py-4 font-display text-base font-black text-zinc-200">{String(race.round).padStart(2, '0')}</td>
                    <td className="px-4 py-4 text-xs text-zinc-400">{race.opensAt}</td>
                    <td className="px-4 py-4 text-xs text-zinc-400">{race.closesAt}</td>
                    <td className="px-4 py-4"><StatusBadge status={race.status} /></td>
                    <td className="px-4 py-4 font-bold text-zinc-300">{race.questions}</td>
                    <td className="px-5 py-4 text-right">
                      <details className="relative inline-block text-left">
                        <summary aria-label={`Open actions for ${race.name}`} className="list-none cursor-pointer rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-yellow-400/35 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 [&::-webkit-details-marker]:hidden">
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 w-36 rounded-xl border border-white/10 bg-[#18181b] p-1.5 shadow-2xl">
                          <button type="button" onClick={() => openEdit(race)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 hover:text-yellow-300">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit Race
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-6"><EmptyNotice>No demonstration races match those filters.</EmptyNotice></div>}
      </Panel>

      <RaceFormModal race={selectedRace} open={modalOpen} onClose={() => setModalOpen(false)} onDemoSave={handleDemoSave} />
    </div>
  );
}
