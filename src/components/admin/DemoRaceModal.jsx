import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Field, inputClass, Modal } from './AdminUI';

const toSriLankaInput = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: 'Asia/Colombo',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

export default function DemoRaceModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('Demo Grand Prix');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const close = new Date(now.getTime() + 30 * 60_000);
    setName('Demo Grand Prix');
    setOpensAt(toSriLankaInput(now));
    setClosesAt(toSriLankaInput(close));
    setSaving(false);
    setError('');
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter a name for the rehearsal.');
    if (!opensAt || !closesAt || new Date(`${closesAt}:00+05:30`) <= new Date(`${opensAt}:00+05:30`)) {
      return setError('Closing time must be later than opening time.');
    }

    setSaving(true);
    try {
      await onCreate({ name: name.trim(), opensAt, closesAt });
      onClose();
    } catch (createError) {
      setError(createError.message || 'Unable to create the demo race.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Create Demo Race" description="Creates an isolated rehearsal with the standard seven questions. Demo scores never count toward season or Hosts Championship totals." size="lg">
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-violet-400/25 bg-violet-400/10 p-4 sm:col-span-2">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden="true" />
          <p className="text-sm leading-6 text-violet-100">The race opens immediately at the selected time and includes all seven driver/constructor questions. It remains visible in the race leaderboard for your meeting rehearsal.</p>
        </div>
        <Field label="Demo name" hint="Clearly label it as a rehearsal">
          <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} maxLength={80} required />
        </Field>
        <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-400">Circuit: Demo Circuit<br />Season roster: 2026<br />Questions: 7 × 1 point</div>
        <Field label="Predictions open" hint="Sri Lanka time">
          <input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className={inputClass} required />
        </Field>
        <Field label="Predictions close" hint="Set this after everyone has submitted">
          <input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className={inputClass} required />
        </Field>
        {error && <p role="alert" className="text-sm font-semibold text-red-300 sm:col-span-2">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-violet-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black disabled:cursor-wait disabled:opacity-60">{saving ? 'Creating rehearsal...' : 'Create & Open Demo'}</button>
        </div>
      </form>
    </Modal>
  );
}
