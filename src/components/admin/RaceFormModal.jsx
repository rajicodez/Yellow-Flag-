import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarCheck2 } from 'lucide-react';
import { activeF1Season, f1Schedule2026 } from '../../data/schedule';
import { Field, inputClass, Modal } from './AdminUI';
import UpcomingRaceSelect from './UpcomingRaceSelect';

const toSriLankaInput = (value) => {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: 'Asia/Colombo',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

function createSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RaceFormModal({ race, races = [], open, onClose, onSave }) {
  const isEditing = Boolean(race);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [predictionOpens, setPredictionOpens] = useState('');
  const [predictionCloses, setPredictionCloses] = useState('');
  const [status, setStatus] = useState('Draft');
  const [details, setDetails] = useState({ name: '', circuit: '', country: '', countryCode: '', round: '', season: activeF1Season, raceStart: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [pendingCalendarId, setPendingCalendarId] = useState('');
  const keepCurrentRef = useRef(null);

  const upcomingRaces = useMemo(() => f1Schedule2026
    .filter((calendarRace) => (
      calendarRace.season === activeF1Season
      && new Date(calendarRace.raceStart).getTime() >= Date.now()
    ))
    .sort((first, second) => new Date(first.raceStart) - new Date(second.raceStart)), []);

  const addedRaceIds = useMemo(
    () => new Set(races.map((existingRace) => (
      existingRace.calendarId
      ?? f1Schedule2026.find((calendarRace) => (
        calendarRace.season === existingRace.season && calendarRace.round === existingRace.round
      ))?.id
    )).filter(Boolean)),
    [races]
  );

  const selectedCalendarRace = f1Schedule2026.find((calendarRace) => calendarRace.id === selectedCalendarId);
  useEffect(() => {
    if (!open) return;
    setSelectedCalendarId(race?.calendarId ?? '');
    setPredictionOpens(race?.predictionOpens ?? '');
    setPredictionCloses(race?.predictionCloses ?? '');
    setStatus(race?.status ?? 'Draft');
    setDetails({
      name: race?.name ?? '', circuit: race?.circuit ?? '', country: race?.country ?? '',
      countryCode: race?.countryCode ?? '', round: race?.round ?? '', season: race?.season ?? activeF1Season,
      raceStart: toSriLankaInput(race?.raceStart),
    });
    setSaving(false);
    setErrors({});
    setPendingCalendarId('');
  }, [open, race]);

  useEffect(() => {
    if (!pendingCalendarId) return undefined;
    const focusFrame = window.requestAnimationFrame(() => keepCurrentRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [pendingCalendarId]);

  const resetTemporaryState = () => {
    setSelectedCalendarId('');
    setPredictionOpens('');
    setPredictionCloses('');
    setStatus('Draft');
    setDetails({ name: '', circuit: '', country: '', countryCode: '', round: '', season: activeF1Season, raceStart: '' });
    setSaving(false);
    setErrors({});
    setPendingCalendarId('');
  };

  const closeForm = () => {
    if (pendingCalendarId) {
      setPendingCalendarId('');
      return;
    }
    resetTemporaryState();
    onClose();
  };

  const applyCalendarRace = (calendarId) => {
    const nextRace = f1Schedule2026.find((calendarRace) => calendarRace.id === calendarId);
    if (!nextRace) return;
    setSelectedCalendarId(nextRace.id);
    setPredictionOpens('');
    setPredictionCloses('');
    setStatus('Draft');
    setDetails({
      name: nextRace.name, circuit: nextRace.circuit, country: nextRace.country,
      countryCode: '', round: nextRace.round, season: nextRace.season,
      raceStart: toSriLankaInput(nextRace.raceStart),
    });
    setErrors({});
    setPendingCalendarId('');
  };

  const requestCalendarChange = (calendarId) => {
    if (!selectedCalendarId) {
      applyCalendarRace(calendarId);
      return;
    }

    const editableFieldsChanged = Boolean(
      predictionOpens
      || predictionCloses
      || status !== 'Draft'
    );

    if (editableFieldsChanged) {
      setPendingCalendarId(calendarId);
      return;
    }

    applyCalendarRace(calendarId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const formData = new FormData(event.currentTarget);
    const submittedPredictionOpens = String(formData.get('predictionOpens') ?? '');
    const submittedPredictionCloses = String(formData.get('predictionCloses') ?? '');
    const submittedRaceStart = String(formData.get('raceStart') ?? '');

    if (!isEditing && !selectedCalendarRace) {
      nextErrors.race = 'Select an upcoming race before continuing.';
    } else if (!isEditing && addedRaceIds.has(selectedCalendarRace.id)) {
      nextErrors.race = 'This race has already been added.';
    }

    if (!submittedPredictionOpens || !submittedPredictionCloses) {
      nextErrors.prediction = 'Prediction opening and closing times are required.';
    } else if (new Date(`${submittedPredictionCloses}:00+05:30`).getTime() <= new Date(`${submittedPredictionOpens}:00+05:30`).getTime()) {
      nextErrors.prediction = 'Prediction closing time must be later than the opening time.';
    }
    if (!details.name.trim() || !details.circuit.trim() || !details.country.trim() || !details.round || !details.season || !submittedRaceStart) {
      nextErrors.details = 'Complete all race details before saving.';
    } else if (new Date(`${submittedRaceStart}:00+05:30`).getTime() <= new Date(`${submittedPredictionCloses}:00+05:30`).getTime()) {
      nextErrors.details = 'Race start time must be later than the prediction closing time.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const savedRace = {
      ...race,
      id: race?.id ?? selectedCalendarRace?.id,
      calendarId: race?.calendarId ?? selectedCalendarRace?.id ?? null,
      name: details.name.trim(),
      slug: race?.slug ?? createSlug(details.name),
      circuit: details.circuit.trim(),
      country: details.country.trim(),
      countryCode: details.countryCode.trim().toUpperCase() || undefined,
      round: Number(details.round),
      season: Number(details.season),
      raceStart: new Date(`${submittedRaceStart}:00+05:30`).toISOString(),
      predictionOpens: submittedPredictionOpens,
      predictionCloses: submittedPredictionCloses,
      status,
      sprintWeekend: false,
      questions: race?.questions ?? 0,
    };

    setSaving(true);
    try {
      await onSave({ race: savedRace, isEditing });
      resetTemporaryState();
    } catch (error) {
      setErrors({ server: error.message || 'Unable to save this race.' });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeForm}
      title={isEditing ? 'Edit Race' : 'Create Race'}
      description="Review calendar details and save the official prediction window to Supabase."
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="grid min-w-0 gap-5 sm:grid-cols-2">
        {!isEditing && (
          <UpcomingRaceSelect
            races={upcomingRaces}
            addedRaceIds={addedRaceIds}
            value={selectedCalendarId}
            onChange={requestCalendarChange}
            error={errors.race}
          />
        )}

        {isEditing && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] p-4 sm:col-span-2">
            <CalendarCheck2 className="h-5 w-5 shrink-0 text-yellow-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">Calendar race</p>
              <p className="mt-1 truncate text-sm font-bold text-white">Round {race.round} — {race.name}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-white">Official race details</h4>
            <p className="mt-1 text-xs text-zinc-500">Calendar values are suggested defaults. Administrators can correct official changes.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300">
            <CalendarCheck2 className="h-3 w-3" aria-hidden="true" /> Editable calendar defaults
          </span>
        </div>

        <Field label="Race name"><input value={details.name} onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))} className={inputClass} required /></Field>
        <Field label="Slug" hint={isEditing ? 'Stable after creation' : 'Generated automatically'}><input value={race?.slug ?? createSlug(details.name)} readOnly className={`${inputClass} bg-white/[0.035] text-zinc-400`} /></Field>
        <Field label="Circuit / track"><input value={details.circuit} onChange={(event) => setDetails((current) => ({ ...current, circuit: event.target.value }))} className={inputClass} required /></Field>
        <Field label="Country"><input value={details.country} onChange={(event) => setDetails((current) => ({ ...current, country: event.target.value }))} className={inputClass} required /></Field>
        <Field label="Country code" hint="Optional ISO code, e.g. IT"><input value={details.countryCode} onChange={(event) => setDetails((current) => ({ ...current, countryCode: event.target.value.slice(0, 2).toUpperCase() }))} className={inputClass} maxLength={2} /></Field>
        <Field label="Round"><input type="number" min="1" value={details.round} onChange={(event) => setDetails((current) => ({ ...current, round: event.target.value }))} className={inputClass} required /></Field>
        <Field label="Season"><input type="number" min="2020" max="2100" value={details.season} onChange={(event) => setDetails((current) => ({ ...current, season: event.target.value }))} className={inputClass} required /></Field>
        <Field label="Race start" hint="Sri Lanka time"><input type="datetime-local" name="raceStart" value={details.raceStart} onChange={(event) => setDetails((current) => ({ ...current, raceStart: event.target.value }))} className={inputClass} required /></Field>
        {errors.details && <p role="alert" className="-mt-2 text-xs font-semibold text-red-300 sm:col-span-2">{errors.details}</p>}

        <div className="border-b border-white/10 pb-4 sm:col-span-2">
          <h4 className="text-sm font-black uppercase tracking-[0.14em] text-white">Admin-controlled details</h4>
          <p className="mt-1 text-xs text-zinc-500">Set when users can start and stop submitting predictions.</p>
        </div>

        <Field label="Prediction Opens" hint="Required · Sri Lanka time">
          <input
            type="datetime-local"
            name="predictionOpens"
            value={predictionOpens}
            onChange={(event) => {
              setPredictionOpens(event.target.value);
              setErrors((current) => ({ ...current, prediction: undefined }));
            }}
            className={`${inputClass} ${errors.prediction ? 'border-red-400/70' : ''}`}
            required
          />
        </Field>
        <Field label="Prediction Closes" hint="Required · Sri Lanka time">
          <input
            type="datetime-local"
            name="predictionCloses"
            value={predictionCloses}
            onChange={(event) => {
              setPredictionCloses(event.target.value);
              setErrors((current) => ({ ...current, prediction: undefined }));
            }}
            className={`${inputClass} ${errors.prediction ? 'border-red-400/70' : ''}`}
            required
          />
        </Field>
        {errors.prediction && <p role="alert" className="-mt-2 text-xs font-semibold text-red-300 sm:col-span-2">{errors.prediction}</p>}

        <Field label="Status" hint="Admin controlled">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option>Draft</option>
            <option>Open</option>
            <option>Closed</option>
          </select>
        </Field>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-400">
          Every race uses the meeting-approved seven-question, seven-point format.
        </div>

        {errors.server && <p role="alert" className="text-sm font-semibold text-red-300 sm:col-span-2">{errors.server}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeForm} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200 disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Saving...' : isEditing ? 'Save Race Changes' : 'Create Race'}
          </button>
        </div>
      </form>

      {pendingCalendarId && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="change-race-title" aria-describedby="change-race-description" className="w-full max-w-md rounded-2xl border border-yellow-400/25 bg-[#171719] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.8)] sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-2.5 text-yellow-300">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h4 id="change-race-title" className="font-display text-xl font-black uppercase text-white">Change selected race?</h4>
                <p id="change-race-description" className="mt-2 text-sm leading-6 text-zinc-400">Changing the race will replace the current auto-filled race details.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button ref={keepCurrentRef} type="button" onClick={() => setPendingCalendarId('')} className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
                Keep Current Race
              </button>
              <button type="button" onClick={() => applyCalendarRace(pendingCalendarId)} className="rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200">
                Change Race
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
