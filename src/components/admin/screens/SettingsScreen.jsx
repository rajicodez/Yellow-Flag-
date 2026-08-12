import { useState } from 'react';
import { Bell, Gauge, Save, Settings2, Wrench } from 'lucide-react';
import { DemoLabel, Field, inputClass, Panel, ScreenHeading } from '../AdminUI';

function ToggleRow({ label, description, checked, onChange, danger = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-4 last:border-b-0">
      <div><p className={`text-sm font-bold ${danger ? 'text-red-300' : 'text-white'}`}>{label}</p><p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">{description}</p></div>
      <button type="button" role="switch" aria-checked={checked} aria-label={`Toggle ${label}`} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-yellow-400/50 ${checked ? (danger ? 'border-red-400/40 bg-red-500' : 'border-yellow-400/40 bg-yellow-400') : 'border-white/15 bg-zinc-800'}`}><span className={`absolute top-1 h-4 w-4 rounded-full transition ${checked ? 'left-7 bg-black' : 'left-1 bg-zinc-400'}`} /></button>
    </div>
  );
}

function SettingsPanel({ icon: Icon, eyebrow, title, children }) {
  return <Panel className="overflow-hidden"><div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6"><span className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-2 text-yellow-300"><Icon className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</p><h3 className="mt-1 font-display text-lg font-black uppercase text-white">{title}</h3></div></div><div className="p-5 sm:p-6">{children}</div></Panel>;
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [notice, setNotice] = useState('');

  const savePreview = () => setNotice('Settings preview saved in local UI state only. No configuration or database values changed.');

  return (
    <div className="space-y-7">
      <ScreenHeading eyebrow="Control Configuration" title="Settings" description="Preview operational settings for the prediction system. These controls are intentionally disconnected from production configuration." action={<DemoLabel>UI Only</DemoLabel>} />
      {notice && <div role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">{notice}</div>}
      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsPanel icon={Settings2} eyebrow="Championship" title="Season Settings"><div className="grid gap-5 sm:grid-cols-2"><Field label="Active season"><select className={inputClass} defaultValue="2026"><option>2026</option><option>2025</option></select></Field><Field label="Current round"><input type="number" min="1" max="24" className={inputClass} defaultValue="15" /></Field></div></SettingsPanel>
        <SettingsPanel icon={Gauge} eyebrow="Prediction Rules" title="Default Settings"><div className="grid gap-5 sm:grid-cols-2"><Field label="Points per correct answer"><input type="number" min="1" max="1" className={inputClass} defaultValue="1" /></Field><Field label="Required questions"><input type="number" min="7" max="7" className={inputClass} defaultValue="7" /></Field></div><div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-zinc-500">Defaults preview: one point per correct answer and seven questions per race.</div></SettingsPanel>
        <SettingsPanel icon={Bell} eyebrow="Communications" title="Admin Notifications"><ToggleRow label="Admin notifications" description="Preview control for operational notifications." checked={notifications} onChange={setNotifications} /><ToggleRow label="Deadline alerts" description="Preview alert before a race prediction window closes." checked={deadlineAlerts} onChange={setDeadlineAlerts} /></SettingsPanel>
        <SettingsPanel icon={Wrench} eyebrow="Site Operations" title="Maintenance Mode Preview"><ToggleRow label="Maintenance mode" description="Visual preview only. Enabling this toggle will not affect the public website." checked={maintenance} onChange={setMaintenance} danger /><div className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${maintenance ? 'border-red-400/25 bg-red-400/10 text-red-200' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'}`}>{maintenance ? 'Maintenance preview enabled locally. Public site remains online.' : 'Maintenance preview disabled. Public site remains unaffected.'}</div></SettingsPanel>
      </div>
      <div className="flex justify-end"><button type="button" onClick={savePreview} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black sm:w-auto"><Save className="h-4 w-4" aria-hidden="true" /> Save Demo Settings</button></div>
    </div>
  );
}
