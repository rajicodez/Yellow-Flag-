import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarCheck2, Flag } from 'lucide-react';
import { activeF1Season, f1Schedule2026 } from '../../data/schedule';
import { Field, inputClass, Modal } from './AdminUI';
import UpcomingRaceSelect from './UpcomingRaceSelect';

const raceDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Colombo',
});

const raceTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Colombo',
});

function createSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CalendarField({ label, value, placeholder = 'Select an upcoming race first' }) {
  return (
    <Field label={label} hint={value ? 'Auto-filled from race calendar' : undefined}>
      <input
        value={value ?? ''}
        placeholder={placeholder}
        readOnly
        disabled={!value}
        className={`${inputClass} cursor-default bg-white/[0.035] text-zinc-300 disabled:cursor-not-allowed disabled:opacity-55`}
      />
    </Field>
  );
}

export default function RaceFormModal({ race, races = [], open, onClose, onDemoSave }) {
  const isEditing = Boolean(race);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [predictionOpens, setPredictionOpens] = useState('');
  const [predictionCloses, setPredictionCloses] = useState('');
  const [status, setStatus] = useState('Draft');
  const [sprintWeekend, setSprintWeekend] = useState(false);
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
    () => new Set(races.map((existingRace) => existingRace.calendarId).filter(Boolean)),
    [races]
  );

  const selectedCalendarRace = f1Schedule2026.find((calendarRace) => calendarRace.id === selectedCalendarId);
  const officialRace = isEditing ? race : selectedCalendarRace;

  useEffect(() => {
    if (!open) return;
    setSelectedCalendarId(race?.calendarId ?? '');
    setPredictionOpens(race?.predictionOpens ?? '');
    setPredictionCloses(race?.predictionCloses ?? '');
    setStatus(race?.status ?? 'Draft');
    setSprintWeekend(Boolean(race?.sprintWeekend));
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
    setSprintWeekend(false);
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
    setSprintWeekend(nextRace.sprintWeekend);
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
      || sprintWeekend !== selectedCalendarRace?.sprintWeekend
    );

    if (editableFieldsChanged) {
      setPendingCalendarId(calendarId);
      return;
    }

    applyCalendarRace(calendarId);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const formData = new FormData(event.currentTarget);
    const submittedPredictionOpens = String(formData.get('predictionOpens') ?? '');
    const submittedPredictionCloses = String(formData.get('predictionCloses') ?? '');

    if (!isEditing && !selectedCalendarRace) {
      nextErrors.race = 'Select an upcoming race before continuing.';
    } else if (!isEditing && addedRaceIds.has(selectedCalendarRace.id)) {
      nextErrors.race = 'This race has already been added.';
    }

    if (!submittedPredictionOpens || !submittedPredictionCloses) {
      nextErrors.prediction = 'Prediction opening and closing times are required.';
    } else if (new Date(submittedPredictionCloses).getTime() <= new Date(submittedPredictionOpens).getTime()) {
      nextErrors.prediction = 'Prediction closing time must be later than the opening time.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const sourceRace = isEditing ? race : selectedCalendarRace;
    const savedRace = {
      ...race,
      id: race?.id ?? sourceRace.id,
      calendarId: sourceRace.calendarId ?? sourceRace.id,
      name: sourceRace.name,
      slug: createSlug(sourceRace.name),
      circuit: sourceRace.circuit,
      country: sourceRace.country,
      round: sourceRace.round,
      season: sourceRace.season,
      raceStart: sourceRace.raceStart,
      predictionOpens: submittedPredictionOpens,
      predictionCloses: submittedPredictionCloses,
      status,
      sprintWeekend,
      questions: sprintWeekend ? 9 : 7,
    };

    onDemoSave({ race: savedRace, isEditing });
    resetTemporaryState();
  };

  const raceDate = officialRace?.raceStart
    ? raceDateFormatter.format(new Date(officialRace.raceStart))
    : '';
  const raceStartTime = officialRace?.raceStart
    ? `${raceTimeFormatter.format(new Date(officialRace.raceStart))} · Sri Lanka time`
    : '';

  return (
    <Modal
      open={open}
      onClose={closeForm}
      title={isEditing ? 'Edit Race' : 'Create Race'}
      description="Review calendar details and set the UI-only prediction window."
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
            <p className="mt-1 text-xs text-zinc-500">Read-only values shared with the public race calendar.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300">
            <CalendarCheck2 className="h-3 w-3" aria-hidden="true" /> Auto-filled from race calendar
          </span>
        </div>

        <CalendarField label="Race name" value={officialRace?.name} />
        <CalendarField label="Slug" value={officialRace?.name ? createSlug(officialRace.name) : ''} />
        <CalendarField label="Circuit" value={officialRace?.circuit} />
        <CalendarField label="Country" value={officialRace?.country} />
        <CalendarField label="Round" value={officialRace?.round ? String(officialRace.round) : ''} />
        <CalendarField label="Season" value={officialRace?.season ? String(officialRace.season) : ''} />
        <CalendarField label="Race date" value={raceDate} />
        <CalendarField label="Race start time" value={raceStartTime} />

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
            <option>Scored</option>
          </select>
        </Field>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-zinc-200">Sprint Weekend</p>
              <p className="mt-1 text-xs text-zinc-500">{sprintWeekend ? '9 questions · maximum 9 points' : '7 questions · maximum 7 points'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sprintWeekend}
              onClick={() => setSprintWeekend((current) => !current)}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-yellow-400/50 ${sprintWeekend ? 'border-yellow-300 bg-yellow-400' : 'border-white/15 bg-zinc-800'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${sprintWeekend ? 'left-6' : 'left-1'}`} />
              <span className="sr-only">Toggle Sprint Weekend</span>
            </button>
          </div>
          {sprintWeekend && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-yellow-300">
              <Flag className="h-3 w-3" aria-hidden="true" /> Sprint Weekend
            </span>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeForm} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-200">
            {isEditing ? 'Save Race Changes' : 'Create Race'}
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
