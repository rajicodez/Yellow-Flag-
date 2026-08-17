import { useState } from 'react';
import { CalendarDays, CircleHelp, Eye, GripVertical, Pencil, Save } from 'lucide-react';
import AdminRaceSelect from '../AdminRaceSelect';
import { Field, inputClass, Modal, Panel, ScreenHeading, StatusBadge } from '../AdminUI';
import { getRaceStableId } from '../useAdminRaceWorkspace';

const raceDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Colombo',
});

function getPredictionStatus(race) {
  if (race.status === 'Open') return 'Predictions Open';
  if (race.status === 'Closed') return 'Predictions Closed';
  return race.status;
}

function QuestionModal({ question, open, onClose, onSave }) {
  const editing = Boolean(question);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updatedQuestion = editing ? {
      ...question,
      key: question.key,
      text: formData.get('text').toString(),
      type: question.type,
      points: 1,
      active: true,
    } : null;

    onSave(
      updatedQuestion,
      editing
        ? 'Question text updated locally. Save the full set to update Supabase.'
        : 'The current question set remains unchanged.'
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Question' : 'Add Question'} description="Edit the display text. Stable keys and answer types are protected for scoring safety." size="lg">
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <Field label="Question key" hint="Stable key used by the future scoring system.">
          <input name="key" className={`${inputClass} cursor-not-allowed opacity-70`} defaultValue={question?.key ?? ''} readOnly required />
        </Field>
        <Field label="Answer type">
          <input className={`${inputClass} cursor-not-allowed opacity-70`} value={question?.type ?? 'Driver'} readOnly />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Question text"><textarea name="text" rows="3" className={inputClass} defaultValue={question?.text ?? ''} placeholder="Enter the prediction question" required /></Field>
        </div>
        <Field label="Points"><input name="points" type="number" min="1" max="1" className={inputClass} defaultValue="1" /></Field>
        <Field label="Status"><input className={`${inputClass} cursor-not-allowed opacity-70`} value="Active" readOnly /></Field>
        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">Cancel</button>
          <button type="submit" className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black focus:outline-none focus:ring-2 focus:ring-yellow-200">Update Question Draft</button>
        </div>
      </form>
    </Modal>
  );
}

function QuestionRow({ question, onEdit }) {
  return (
    <li className={`grid min-w-0 gap-4 rounded-xl border p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center ${question.sprint ? 'border-yellow-400/25 bg-yellow-400/[0.025]' : 'border-white/10 bg-black/20'} ${question.active ? '' : 'border-dashed opacity-70'}`}>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Reorder question ${question.id}`} className="cursor-grab rounded-lg p-2 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/25 bg-yellow-400/10 font-display text-sm font-black text-yellow-300">Q{question.questionNumber}</span>
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <code className="max-w-full break-all rounded-md bg-black/35 px-2 py-1 text-[10px] text-zinc-500">{question.key}</code>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">{question.type}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">{question.points} Point</span>
        </div>
        <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{question.text}</p>
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">Active</span>
        <button type="button" onClick={() => onEdit(question)} aria-label={`Edit question ${question.id}`} className="rounded-lg border border-white/10 p-2.5 text-zinc-400 transition hover:border-yellow-400/35 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export default function QuestionsScreen({
  createQuestionsForRace,
  dirtyRaceIds,
  discardQuestionChanges,
  onNavigate,
  questionsByRaceId,
  races,
  saveQuestionDraft,
  selectedRaceId,
  setSelectedRaceId,
  sprintWeekend,
}) {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDefaultsOpen, setCreateDefaultsOpen] = useState(false);
  const [pendingRaceId, setPendingRaceId] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedRace = races.find((race) => getRaceStableId(race) === selectedRaceId) ?? null;
  const questions = questionsByRaceId[selectedRaceId] ?? [];
  const standardQuestions = questions;
  const activeQuestionCount = questions.filter((question) => question.active).length;
  const hasUnsavedChanges = dirtyRaceIds.has(selectedRaceId);
  const {
    maximumPoints,
    totalQuestions,
    updateQuestion,
  } = sprintWeekend;

  const openEdit = (question) => {
    setSelectedQuestion(question);
    setModalOpen(true);
  };

  const toggleQuestion = (id, updates) => {
    updateQuestion(id, updates);
    setNotice('Question status changed locally. Save the seven-question set to update Supabase.');
  };

  const handleQuestionSave = (updatedQuestion, message) => {
    if (updatedQuestion) updateQuestion(updatedQuestion.id, updatedQuestion);
    setModalOpen(false);
    setNotice(message);
  };

  const requestRaceChange = (nextRaceId) => {
    if (nextRaceId === selectedRaceId) return;
    if (hasUnsavedChanges) {
      setPendingRaceId(nextRaceId);
      return;
    }
    setSelectedRaceId(nextRaceId);
    setNotice('');
  };

  const finishRaceSwitch = async (mode) => {
    if (mode === 'discard') discardQuestionChanges(selectedRaceId);
    if (mode === 'save') {
      setSaving(true);
      try {
        await saveQuestionDraft(selectedRaceId);
      } catch (error) {
        setNotice(error.message || 'Unable to save questions.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setSelectedRaceId(pendingRaceId);
    setPendingRaceId('');
    setNotice(mode === 'save' ? 'Questions saved to Supabase.' : 'Unsaved question changes were discarded.');
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveQuestionDraft(selectedRaceId);
      setNotice('Seven questions and their answer options were saved to Supabase.');
    } catch (error) {
      setNotice(error.message || 'Unable to save questions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDefaults = () => {
    createQuestionsForRace(selectedRaceId);
    setCreateDefaultsOpen(false);
    setNotice(`Seven default questions created for ${selectedRace.name}. Review them, then save to Supabase.`);
  };

  if (!races.length || !selectedRace) {
    return (
      <div className="space-y-7">
        <ScreenHeading eyebrow="Race Questions" title="Questions" description="Manage race-specific prediction questions." />
        <Panel className="border-dashed p-6 text-center sm:p-10">
          <p className="text-sm font-semibold text-zinc-300">No races are available. Add an upcoming race in Race Management first.</p>
          <button type="button" onClick={() => onNavigate('races')} className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black focus:outline-none focus:ring-2 focus:ring-yellow-200">Go to Race Management</button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Panel className="overflow-visible border-yellow-400/20 bg-[linear-gradient(115deg,rgba(250,204,21,0.09),rgba(17,17,19,0.94)_58%)] p-5 sm:p-6">
        <AdminRaceSelect
          races={races}
          questionsByRaceId={questionsByRaceId}
          value={selectedRaceId}
          onChange={requestRaceChange}
          label="Select Race"
          placeholder="Choose a race to manage its questions"
        />
        <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="break-words font-display text-xl font-black uppercase text-white sm:text-2xl">{selectedRace.name} — Round {selectedRace.round} — {selectedRace.circuit}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-400">
              <CalendarDays className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              <span>{raceDateFormatter.format(new Date(selectedRace.raceStart))}</span>
              <span className="text-zinc-700" aria-hidden="true">•</span>
              <span>{getPredictionStatus(selectedRace)}</span>
              <span className="text-zinc-700" aria-hidden="true">•</span>
              <span>{activeQuestionCount} Questions Active</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={selectedRace.status} />
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-300">7 Questions · 7 Points</span>
            {hasUnsavedChanges && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-amber-300">Unsaved Changes</span>}
          </div>
        </div>
      </Panel>

      <ScreenHeading
        eyebrow={selectedRace.name}
        title="Questions"
        description={`Manage the ${totalQuestions || 'race-specific'} prediction question set for ${selectedRace.circuit}.`}
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button type="button" onClick={() => onNavigate('races')} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"><Eye className="h-4 w-4" aria-hidden="true" /> View Race Details</button>
            {questions.length > 0 && <button type="button" onClick={handleSaveDraft} disabled={!hasUnsavedChanges || saving} className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-yellow-300 transition hover:bg-yellow-400/15 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:cursor-not-allowed disabled:opacity-45"><Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving...' : 'Save to Supabase'}</button>}
          </div>
        }
      />

      {notice && <div role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">{notice}</div>}

      {!questions.length ? (
        <Panel className="border-dashed p-6 text-center sm:p-10">
          <CircleHelp className="mx-auto h-8 w-8 text-yellow-400" aria-hidden="true" />
          <p className="mt-4 text-base font-bold text-white">Questions have not been configured for this race.</p>
          <p className="mt-2 text-sm text-zinc-500">Create the meeting-approved seven-question Grand Prix set for this race.</p>
          <button type="button" onClick={() => setCreateDefaultsOpen(true)} className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black focus:outline-none focus:ring-2 focus:ring-yellow-200">Create Default Questions</button>
        </Panel>
      ) : (
        <>
          <Panel className="border-yellow-400/20 bg-[linear-gradient(115deg,rgba(250,204,21,0.1),rgba(17,17,19,0.92)_58%)] p-5 sm:p-6">
            <p className="font-display text-lg font-black uppercase text-white">Fixed Competition Format</p>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-400">Every Grand Prix uses exactly seven questions and awards one point for each correct answer, including Sprint weekends.</p>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="p-5"><p className="text-xs font-bold text-zinc-500">Total Questions</p><p className="mt-2 font-display text-3xl font-black text-white">{totalQuestions}</p><p className="mt-2 text-xs text-zinc-500">Fixed competition format</p></Panel>
            <Panel className="p-5"><p className="text-xs font-bold text-zinc-500">Maximum Points</p><p className="mt-2 font-display text-3xl font-black text-white">{maximumPoints}</p><p className="mt-2 text-xs text-zinc-500">One point per correct answer</p></Panel>
            <Panel className="p-5"><p className="text-xs font-bold text-zinc-500">Active Questions</p><p className="mt-2 font-display text-3xl font-black text-white">{activeQuestionCount}</p><p className="mt-2 text-xs text-zinc-500">Selected race only</p></Panel>
          </div>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Question Order</p><h3 className="mt-1 truncate font-display text-xl font-black uppercase text-white">{selectedRace.name} Prediction Set</h3></div>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Database-backed</span>
            </div>
            <ol className="space-y-3 bg-[#0d0d0f] p-3 sm:p-4">
              {standardQuestions.map((question) => <QuestionRow key={question.id} question={question} onEdit={openEdit} />)}
            </ol>
            <div className="flex items-center gap-2 border-t border-white/10 bg-black/20 px-5 py-4 text-xs text-zinc-500"><CircleHelp className="h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" /> Question numbers and keys remain fixed so saved predictions can always be scored safely.</div>
          </Panel>
        </>
      )}

      <QuestionModal question={selectedQuestion} open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleQuestionSave} />

      <Modal open={createDefaultsOpen} onClose={() => setCreateDefaultsOpen(false)} title="Create default questions?" description="Prepare the seven-question Grand Prix set before saving it.">
        <p className="text-sm leading-6 text-zinc-300">This prepares the standard questions for {selectedRace.name}. Review them and use Save to Supabase to make them live.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setCreateDefaultsOpen(false)} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button>
          <button type="button" onClick={handleCreateDefaults} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Create Default Questions</button>
        </div>
      </Modal>

      <Modal open={Boolean(pendingRaceId)} onClose={() => setPendingRaceId('')} title="Switch to another race?">
        <p className="text-sm leading-6 text-zinc-300">You have unsaved question changes for the current race.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={() => setPendingRaceId('')} className="w-full rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button>
          <button type="button" onClick={() => finishRaceSwitch('discard')} className="w-full rounded-xl border border-red-400/25 bg-red-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-red-300">Discard Changes and Switch</button>
          <button type="button" onClick={() => finishRaceSwitch('save')} disabled={saving} className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:opacity-60">Save to Supabase and Switch</button>
        </div>
      </Modal>

    </div>
  );
}
