import { Field, inputClass, Modal } from './AdminUI';

export default function RaceFormModal({ race, open, onClose, onDemoSave }) {
  const isEditing = Boolean(race);

  const handleSubmit = (event) => {
    event.preventDefault();
    onDemoSave(isEditing ? 'Race changes previewed locally. No database record was updated.' : 'New race preview created locally. No database record was added.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Race' : 'Create Race'}
      description="UI prototype fields — saving does not write to Supabase."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <Field label="Race name">
          <input className={inputClass} defaultValue={race?.name ?? ''} placeholder="Dutch Grand Prix" required />
        </Field>
        <Field label="Slug">
          <input className={inputClass} defaultValue={race?.slug ?? ''} placeholder="dutch-grand-prix" required />
        </Field>
        <Field label="Circuit">
          <input className={inputClass} defaultValue={race?.circuit ?? ''} placeholder="Circuit Zandvoort" required />
        </Field>
        <Field label="Country">
          <input className={inputClass} defaultValue={race?.country ?? ''} placeholder="Netherlands" required />
        </Field>
        <Field label="Round">
          <input type="number" min="1" max="24" className={inputClass} defaultValue={race?.round ?? 15} required />
        </Field>
        <Field label="Season">
          <input type="number" min="2020" className={inputClass} defaultValue={race?.season ?? 2026} required />
        </Field>
        <Field label="Opens at">
          <input type="datetime-local" className={inputClass} defaultValue="2026-08-20T09:00" required />
        </Field>
        <Field label="Closes at">
          <input type="datetime-local" className={inputClass} defaultValue="2026-08-23T17:30" required />
        </Field>
        <Field label="Status">
          <select className={inputClass} defaultValue={race?.status ?? 'Draft'}>
            <option>Draft</option>
            <option>Open</option>
            <option>Closed</option>
            <option>Scored</option>
          </select>
        </Field>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200">
            Save Demo Race
          </button>
        </div>
      </form>
    </Modal>
  );
}
