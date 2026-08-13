import { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Flag,
  Gauge,
  Pencil,
  Timer,
  Users,
} from 'lucide-react';
import RaceFormModal from '../RaceFormModal';
import { DemoLabel, Modal, Panel, ScreenHeading, StatusBadge } from '../AdminUI';
import { demoRaces, recentActivity } from '../data';

const summaryCards = [
  { label: 'Registered Users', value: '128', detail: 'Sample community total', icon: Users, color: 'text-blue-300 bg-blue-400/10 border-blue-400/20' },
  { label: 'Submitted Predictions', value: '94', detail: 'Dutch Grand Prix', icon: CheckCircle2, color: 'text-violet-300 bg-violet-400/10 border-violet-400/20' },
  { label: 'Current Race', value: 'Dutch GP', detail: 'Round 15 · Zandvoort', icon: Flag, color: 'text-red-300 bg-red-400/10 border-red-400/20' },
  { label: 'Predictions Status', value: 'Open', detail: 'Closes in 3 days', icon: Gauge, color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
];

export default function DashboardScreen({ sprintWeekend }) {
  const [raceModalOpen, setRaceModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const currentRace = demoRaces[0];
  const { maximumPoints, totalQuestions } = sprintWeekend;

  const finishRaceDemo = (message) => {
    setRaceModalOpen(false);
    setCloseModalOpen(false);
    setNotice(message);
  };

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Race Operations"
        title="Control Overview"
        description="A UI-only view of the Yellow Flag prediction control centre. All numbers and activity below are demonstration data."
        action={<DemoLabel />}
      />

      {notice && (
        <div role="status" className="flex items-start justify-between gap-4 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss demo notice" className="text-yellow-400 hover:text-white">×</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map(({ label, value, detail, icon: Icon, color }) => (
          <Panel key={label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-zinc-500">{label}</p>
                <p className="mt-3 font-display text-3xl font-black uppercase text-white">{value}</p>
                <p className="mt-1 text-xs text-zinc-500">{detail}</p>
              </div>
              <span className={`rounded-xl border p-2.5 ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <div className="mt-4"><DemoLabel /></div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-white/10 bg-[linear-gradient(115deg,rgba(250,204,21,0.11),transparent_45%)] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <DemoLabel>Current Race · Demo</DemoLabel>
                <StatusBadge status="Open" />
              </div>
              <h3 className="font-display text-2xl font-black uppercase text-white sm:text-3xl">Dutch Grand Prix</h3>
              <p className="mt-1 text-sm text-zinc-400">Circuit Zandvoort · Round 15</p>
            </div>
            <div className="rounded-xl border border-yellow-400/20 bg-black/30 px-4 py-3 text-left sm:text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Countdown Preview</p>
              <p className="mt-1 font-display text-xl font-black tracking-[0.12em] text-yellow-300">03D 14H 26M</p>
            </div>
          </div>

          <div className="grid gap-px bg-white/10 sm:grid-cols-2">
            <div className="flex items-start gap-3 bg-[#111113] p-5 sm:p-6">
              <CalendarClock className="mt-0.5 h-5 w-5 text-yellow-400" aria-hidden="true" />
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Predictions Open</p><p className="mt-1 text-sm font-semibold text-white">20 Aug 2026 · 09:00</p></div>
            </div>
            <div className="flex items-start gap-3 bg-[#111113] p-5 sm:p-6">
              <Timer className="mt-0.5 h-5 w-5 text-red-400" aria-hidden="true" />
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Predictions Close</p><p className="mt-1 text-sm font-semibold text-white">23 Aug 2026 · 17:30</p></div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
                <CircleHelp className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                <div><p className="font-display text-xl font-black text-white">{totalQuestions}</p><p className="text-xs text-zinc-500">Active questions</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4">
                <Gauge className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                <div><p className="font-display text-xl font-black text-white">{maximumPoints}</p><p className="text-xs text-zinc-500">Maximum points</p></div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setRaceModalOpen(true)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit Race
              </button>
              <button type="button" onClick={() => setCloseModalOpen(true)} className="rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-red-300 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400/50">
                Close Predictions
              </button>
            </div>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Demo Feed</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">Recent Activity</h3></div>
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          </div>
          <ul className="divide-y divide-white/10">
            {recentActivity.map((item, index) => (
              <li key={item.id} className="flex gap-3 px-5 py-4">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-[9px] font-black text-yellow-300">{index + 1}</span>
                <div><p className="text-sm font-semibold text-zinc-200">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.detail}</p></div>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 p-4 text-center"><DemoLabel>Demonstration Records</DemoLabel></div>
        </Panel>
      </div>

      <RaceFormModal race={currentRace} open={raceModalOpen} onClose={() => setRaceModalOpen(false)} onDemoSave={finishRaceDemo} />
      <Modal open={closeModalOpen} onClose={() => setCloseModalOpen(false)} title="Close Predictions?" description="This confirmation is a visual prototype only.">
        <p className="text-sm leading-6 text-zinc-300">A production action would prevent additional submissions for the Dutch Grand Prix. No data will change in this demo.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setCloseModalOpen(false)} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300">Cancel</button>
          <button type="button" onClick={() => finishRaceDemo('Close Predictions preview completed. Race status remains unchanged.')} className="rounded-xl bg-red-500 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">Preview Close</button>
        </div>
      </Modal>
    </div>
  );
}
