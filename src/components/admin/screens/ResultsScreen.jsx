import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle, PencilLine, Send } from 'lucide-react';
import AdminRaceSelect from '../AdminRaceSelect';
import { Modal, Panel, ScreenHeading, StatusBadge } from '../AdminUI';
import SearchableAnswerSelect from '../SearchableAnswerSelect';
import { getAdminRosterForSeason } from '../rosters';
import useAdminResults from '../useAdminResults';

const podiumQuestionKeys = ['race_winner', 'p2_finisher', 'p3_finisher'];

function friendlyError(error) {
  const messages = {
    ADMIN_ROLE_REQUIRED: 'Your account no longer has permission to manage results.',
    SUPER_ADMIN_ROLE_REQUIRED: 'Only a Super Admin can correct published results.',
    PREDICTIONS_NOT_CLOSED: 'Official answers cannot be entered until the FP1 prediction deadline has passed.',
    PUBLISHED_RESULTS_IMMUTABLE: 'Published results are locked and cannot be changed.',
    INVALID_OFFICIAL_ANSWER_OPTION: 'One or more answers are not valid options for this race.',
    PODIUM_DRIVERS_MUST_BE_DISTINCT: 'Winner, P2, and P3 must be three different drivers.',
    OFFICIAL_ANSWERS_INCOMPLETE: 'Every official answer is required before scoring.',
    INCOMPLETE_ENTRY_FOUND: 'A submitted prediction is incomplete. Scoring stopped without saving partial results.',
    RACE_NOT_READY_FOR_SCORING: 'This race is not ready to be scored.',
    RACE_SCORES_INCOMPLETE: 'The race cannot be published because one or more entries have no score.',
    CORRECTION_REASON_REQUIRED: 'Enter a clear correction reason of at least 10 characters.',
    CORRECTION_REASON_TOO_LONG: 'Keep the correction reason under 500 characters.',
    NO_OFFICIAL_ANSWER_CHANGE: 'Change at least one official answer before applying the correction.',
    PUBLISHED_RACE_REQUIRED: 'Only a published race can use this correction workflow.',
  };
  return messages[error?.message] || error?.message || 'The operation could not be completed.';
}

function initialsFor(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function enrichOptions(options, question, roster) {
  return options.map((option) => {
    const visual = question.type === 'Driver'
      ? roster.drivers.find((driver) => driver.name === option.value)
      : roster.constructors.find((constructor) => (
          constructor.fullName === option.value || constructor.name === option.value
        ));

    return {
      ...visual,
      answerId: option.value,
      color: visual?.color ?? '#FACC15',
      fullName: visual?.fullName ?? option.name,
      initials: visual?.initials ?? initialsFor(option.name),
      name: option.name,
      number: visual?.number ?? '',
      searchText: `${option.name} ${option.value} ${visual?.searchText ?? ''}`.toLowerCase(),
      teamName: visual?.teamName ?? '',
    };
  });
}

function AnswerRow({ answers, duplicatePodiumQuestionIds, invalidQuestionIds, locked, question, onAnswerChange, options }) {
  const value = answers[question.id] ?? '';
  const invalid = invalidQuestionIds.has(question.id) || duplicatePodiumQuestionIds.has(question.id);

  return (
    <div className={`grid min-w-0 gap-4 rounded-xl border p-5 transition sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)_auto] lg:items-center ${invalid ? 'border-red-400/40 bg-red-400/[0.055]' : value ? 'border-emerald-400/30 bg-emerald-400/[0.035]' : 'border-amber-400/40 bg-amber-400/[0.045]'}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-black text-yellow-300">Q{question.number}</span>
          <code className="break-all text-[10px] text-zinc-600">{question.key}</code>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">{question.type}</span>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-white">{question.text}</p>
        <p className="mt-1 text-xs text-zinc-500">1 point per correct answer</p>
      </div>

      <div className="min-w-0">
        <SearchableAnswerSelect
          disabled={locked}
          invalid={invalid}
          label={`Correct answer for question ${question.number}`}
          onChange={(answerValue) => onAnswerChange(question.id, answerValue)}
          options={options}
          type={question.type}
          value={value}
        />
        {invalidQuestionIds.has(question.id) && <p className="mt-2 text-xs font-bold text-red-300">Select the correct answer.</p>}
        {duplicatePodiumQuestionIds.has(question.id) && <p className="mt-2 text-xs font-bold text-red-300">Choose a different podium driver.</p>}
      </div>

      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${invalid ? 'border-red-400/30 bg-red-400/10 text-red-300' : value ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/35 bg-amber-400/10 text-amber-300'}`}>
        {value && !invalid ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
        {locked ? 'Published' : invalid ? 'Needs Attention' : value ? 'Answer Ready' : 'Awaiting Answer'}
      </span>
    </div>
  );
}

export default function ResultsScreen({ adminRole, onNavigate }) {
  const workspace = useAdminResults();
  const [answersByRaceId, setAnswersByRaceId] = useState({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [operation, setOperation] = useState({ state: 'idle', message: '' });
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');

  const selectedRace = workspace.selectedRace;
  const selectedRaceId = workspace.selectedRaceId;
  const questions = workspace.questionsByRaceId[selectedRaceId] ?? [];
  const officialAnswers = workspace.officialAnswersByRaceId[selectedRaceId] ?? {};
  const answers = answersByRaceId[selectedRaceId] ?? officialAnswers;
  const roster = selectedRace ? getAdminRosterForSeason(selectedRace.season) : { drivers: [], constructors: [] };
  const published = selectedRace?.databaseStatus === 'published';
  const scored = selectedRace?.databaseStatus === 'scored';
  const expectedQuestionCount = selectedRace?.sprintWeekend ? 9 : 7;
  const canCorrectPublished = adminRole === 'super_admin';
  const answersChanged = questions.some((question) => answers[question.id] !== officialAnswers[question.id]);

  useEffect(() => {
    if (!selectedRaceId) return;
    setAnswersByRaceId((current) => ({ ...current, [selectedRaceId]: { ...officialAnswers } }));
    setValidationAttempted(false);
    setReviewOpen(false);
    setConfirmationAction(null);
    setOperation({ state: 'idle', message: '' });
    setCorrectionMode(false);
    setCorrectionReason('');
    // A data refresh after scoring must not clear the success/error result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRaceId]);

  const unansweredQuestionIds = useMemo(
    () => new Set(questions.filter((question) => !answers[question.id]).map((question) => question.id)),
    [answers, questions]
  );
  const duplicatePodiumQuestionIds = useMemo(() => {
    const podiumQuestions = podiumQuestionKeys
      .map((key) => questions.find((question) => question.key === key))
      .filter((question) => question && answers[question.id]);
    const counts = podiumQuestions.reduce((result, question) => {
      const value = answers[question.id];
      result.set(value, (result.get(value) ?? 0) + 1);
      return result;
    }, new Map());
    return new Set(podiumQuestions.filter((question) => counts.get(answers[question.id]) > 1).map((question) => question.id));
  }, [answers, questions]);

  const invalidQuestionIds = validationAttempted ? unansweredQuestionIds : new Set();
  const hasValidationError = unansweredQuestionIds.size > 0 || duplicatePodiumQuestionIds.size > 0;
  const answeredCount = questions.filter((question) => answers[question.id]).length;

  const validateAnswers = () => {
    setValidationAttempted(true);
    return questions.length === expectedQuestionCount && !hasValidationError;
  };

  const handleAnswerChange = (questionId, answerValue) => {
    setAnswersByRaceId((current) => ({
      ...current,
      [selectedRaceId]: { ...(current[selectedRaceId] ?? officialAnswers), [questionId]: answerValue },
    }));
    setReviewOpen(false);
    setOperation({ state: 'idle', message: '' });
  };

  const runScoring = async () => {
    setConfirmationAction(null);
    setOperation({ state: 'loading', message: 'Saving official answers and calculating scores...' });
    try {
      const result = await workspace.scoreRace(answers);
      setOperation({
        state: 'success',
        message: `Scoring version ${result.version} completed for ${result.scored_entry_count} entries${result.reused ? ' using the existing verified result' : ''}.`,
      });
    } catch (error) {
      setOperation({ state: 'error', message: friendlyError(error) });
    }
  };

  const publishResults = async () => {
    setConfirmationAction(null);
    setOperation({ state: 'loading', message: 'Publishing race and season leaderboards...' });
    try {
      const result = await workspace.publishRace();
      setOperation({
        state: 'success',
        message: result.already_published ? 'Results were already published.' : `Published ${result.published_score_count} scores successfully.`,
      });
    } catch (error) {
      setOperation({ state: 'error', message: friendlyError(error) });
    }
  };

  const cancelCorrection = () => {
    setAnswersByRaceId((current) => ({ ...current, [selectedRaceId]: { ...officialAnswers } }));
    setCorrectionMode(false);
    setCorrectionReason('');
    setValidationAttempted(false);
    setConfirmationAction(null);
  };

  const correctPublishedResults = async () => {
    setConfirmationAction(null);
    setOperation({ state: 'loading', message: 'Correcting answers, recalculating scores, and republishing...' });
    try {
      const result = await workspace.correctPublishedRace(answers, correctionReason);
      setCorrectionMode(false);
      setCorrectionReason('');
      setOperation({
        state: 'success',
        message: `Correction published. ${result.changed_answer_count} answer changed and ${result.scored_entry_count} submissions were recalculated as score version ${result.corrected_score_version}.`,
      });
    } catch (error) {
      setOperation({ state: 'error', message: friendlyError(error) });
    }
  };

  if (workspace.loading && !workspace.races.length) {
    return <div role="status" className="flex items-center gap-3 text-sm font-bold text-zinc-300"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" /> Loading results workspace...</div>;
  }

  if (!workspace.races.length || !selectedRace) {
    return (
      <div className="space-y-7">
        <ScreenHeading eyebrow="Results Desk" title="Results & Scoring" description="No non-draft race is available for results." />
        {workspace.error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{workspace.error}</div>}
        <Panel className="border-dashed p-8 text-center"><button type="button" onClick={() => onNavigate('races')} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Go to Race Management</button></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Results Desk"
        title="Results & Scoring"
        description="Record every official answer, calculate scores transactionally, then publish them separately."
        action={<StatusBadge status={selectedRace.status} />}
      />

      {workspace.error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{workspace.error}</div>}
      {operation.state !== 'idle' && (
        <div role={operation.state === 'error' ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${operation.state === 'error' ? 'border-red-400/25 bg-red-400/10 text-red-200' : operation.state === 'success' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-blue-400/25 bg-blue-400/10 text-blue-200'}`}>
          {operation.state === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : operation.state === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {operation.message}
        </div>
      )}

      {validationAttempted && hasValidationError && (
        <div role="alert" className="space-y-1 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
          {unansweredQuestionIds.size > 0 && <p>Select a correct answer for all {expectedQuestionCount} questions.</p>}
          {duplicatePodiumQuestionIds.size > 0 && <p>Winner, P2, and P3 must be different drivers.</p>}
        </div>
      )}

      <Panel className="overflow-visible p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] xl:items-end">
          <AdminRaceSelect races={workspace.races} questionsByRaceId={workspace.questionsByRaceId} value={selectedRaceId} onChange={workspace.setSelectedRaceId} label="Race" placeholder="Choose a race for results" />
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Submissions</p><p className="mt-1 font-display text-xl font-black text-white">{workspace.entryCountByRaceId[selectedRaceId] ?? 0}</p></div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Answered</p><p className="mt-1 font-display text-xl font-black text-white">{answeredCount} / {expectedQuestionCount}</p></div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Score Version</p><p className="mt-1 font-display text-xl font-black text-white">{workspace.latestRunByRaceId[selectedRaceId]?.version ?? '—'}</p></div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">Predictions closed at {new Date(selectedRace.closesAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} (Sri Lanka time).</p>
      </Panel>

      <Panel className="overflow-visible">
        <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-white/10 px-5 py-4 sm:px-6">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Official Answers · {selectedRace.name}</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">{expectedQuestionCount}-Point Result Sheet</h3></div>
          {published && <span className={`text-xs font-black uppercase tracking-[0.16em] ${correctionMode ? 'text-amber-300' : 'text-emerald-300'}`}>{correctionMode ? 'Correction Mode' : 'Published & Locked'}</span>}
        </div>
        <div className="space-y-3 bg-[#0d0d0f] p-3 sm:p-4">
          {questions.map((question) => (
            <AnswerRow
              key={question.id}
              answers={answers}
              duplicatePodiumQuestionIds={duplicatePodiumQuestionIds}
              invalidQuestionIds={invalidQuestionIds}
              onAnswerChange={handleAnswerChange}
              options={enrichOptions(workspace.optionsByQuestionId[question.id] ?? [], question, roster)}
              locked={published && !correctionMode}
              question={question}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-b-2xl border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={() => validateAnswers() && setReviewOpen((current) => !current)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-200"><ClipboardCheck className="h-4 w-4" /> Review Results</button>
          {!published && <button type="button" onClick={() => validateAnswers() && setConfirmationAction('score')} disabled={operation.state === 'loading' || questions.length !== expectedQuestionCount} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:cursor-not-allowed disabled:opacity-50">Save & Calculate Scores</button>}
          {scored && <button type="button" onClick={() => setConfirmationAction('publish')} disabled={operation.state === 'loading'} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black"><Send className="h-4 w-4" /> Publish Results</button>}
          {published && canCorrectPublished && !correctionMode && <button type="button" onClick={() => setCorrectionMode(true)} disabled={operation.state === 'loading'} className="flex items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-amber-200"><PencilLine className="h-4 w-4" /> Correct Published Results</button>}
          {correctionMode && <button type="button" onClick={cancelCorrection} disabled={operation.state === 'loading'} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel Correction</button>}
          {correctionMode && <button type="button" onClick={() => validateAnswers() && setConfirmationAction('correct')} disabled={operation.state === 'loading' || !answersChanged} className="rounded-xl bg-amber-300 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:cursor-not-allowed disabled:opacity-40">Review Correction</button>}
        </div>
      </Panel>

      {reviewOpen && <Panel className="p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">Review Complete</p><p className="mt-2 text-sm text-zinc-300">{correctionMode ? `All ${expectedQuestionCount} corrected answers are valid. Confirming will recalculate and republish every score atomically.` : `All ${expectedQuestionCount} answers are valid. Saving will invalidate an older unpublished score if any answer changed.`}</p></Panel>}

      {correctionMode && <Panel className="border-amber-300/25 bg-amber-300/[0.04] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Protected Published Correction</p><p className="mt-2 text-sm leading-6 text-zinc-300">Change only the incorrect answer. The system will recalculate every Fan and Host submission, publish the corrected leaderboard, and retain an audit record.</p><label className="mt-4 block text-xs font-bold text-zinc-300" htmlFor="correction-reason">Reason for correction</label><textarea id="correction-reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} maxLength={500} rows={3} placeholder="Example: Q6 was published as Red Bull instead of Mercedes." className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-300/50" /><p className="mt-2 text-right text-[10px] text-zinc-500">{correctionReason.trim().length} / 500</p></Panel>}

      <Modal open={confirmationAction === 'score'} onClose={() => setConfirmationAction(null)} title="Save Answers & Calculate?" description="This runs the protected scoring transaction.">
        <p className="text-sm leading-6 text-zinc-300">All {workspace.entryCountByRaceId[selectedRaceId] ?? 0} submissions will be compared with these {expectedQuestionCount} official answers. Results stay hidden until you publish them separately.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={runScoring} className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Confirm Scoring</button>
          <button type="button" onClick={() => setConfirmationAction(null)} className="w-full rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button>
        </div>
      </Modal>

      <Modal open={confirmationAction === 'publish'} onClose={() => setConfirmationAction(null)} title="Publish Results?" description="This makes the leaderboard visible and locks official answers.">
        <p className="text-sm leading-6 text-zinc-300">Confirm only after reviewing the scores. Published official answers cannot be silently edited.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={publishResults} className="w-full rounded-xl bg-emerald-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Confirm Publication</button>
          <button type="button" onClick={() => setConfirmationAction(null)} className="w-full rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button>
        </div>
      </Modal>

      <Modal open={confirmationAction === 'correct'} onClose={() => setConfirmationAction(null)} title="Correct & Republish Results?" description="Super Admin protected action">
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100"><strong>This immediately replaces the published leaderboard.</strong> Every Fan and Host score will be recalculated using the corrected answers.</div>
        <p className="mt-4 text-sm leading-6 text-zinc-300">Reason: {correctionReason.trim() || 'No reason entered'}</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={correctPublishedResults} disabled={correctionReason.trim().length < 10 || !answersChanged} className="w-full rounded-xl bg-amber-300 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:cursor-not-allowed disabled:opacity-40">Confirm Correction & Republish</button>
          <button type="button" onClick={() => setConfirmationAction(null)} className="w-full rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Go Back</button>
        </div>
      </Modal>
    </div>
  );
}
