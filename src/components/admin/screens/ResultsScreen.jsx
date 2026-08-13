import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { DemoLabel, inputClass, Modal, Panel, ScreenHeading } from '../AdminUI';
import SearchableAnswerSelect from '../SearchableAnswerSelect';
import { demoRaces } from '../data';
import { getAdminRosterForSeason } from '../rosters';

const resultRaceNames = new Set(['Dutch Grand Prix', 'Hungarian Grand Prix', 'British Grand Prix']);
const resultRaces = demoRaces.filter((race) => resultRaceNames.has(race.name));
const podiumQuestionKeys = ['race_winner', 'second_place', 'third_place'];

function AnswerRow({
  answers,
  duplicatePodiumQuestionIds,
  invalidQuestionIds,
  onAnswerChange,
  options,
  question,
}) {
  const value = answers[question.id] ?? '';
  const invalid = invalidQuestionIds.has(question.id) || duplicatePodiumQuestionIds.has(question.id);
  const unanswered = question.active && !value;
  const answerState = invalid
    ? 'invalid'
    : !question.active
      ? 'inactive'
      : value
        ? 'complete'
        : 'unanswered';

  return (
    <div className={`relative grid min-w-0 gap-4 rounded-xl border p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)_auto] lg:items-center ${
      answerState === 'invalid'
        ? 'border-red-400/40 bg-red-400/[0.055] ring-1 ring-inset ring-red-400/20'
        : answerState === 'complete'
          ? 'border-emerald-400/30 bg-emerald-400/[0.035]'
          : answerState === 'unanswered'
            ? 'border-amber-400/40 bg-amber-400/[0.045]'
            : question.sprint
              ? 'border-yellow-400/25 bg-yellow-400/[0.025]'
              : 'border-white/10 bg-black/20'
    }`}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-display text-sm font-black text-yellow-300">Q{question.id}</span>
          <code className="max-w-full break-all text-[10px] text-zinc-600">{question.key}</code>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">{question.type}</span>
          {question.sprint && <DemoLabel>Sprint</DemoLabel>}
        </div>
        <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{question.text}</p>
        <p className="mt-1 text-xs text-zinc-500">1 point per correct answer</p>
      </div>

      <div className="min-w-0">
        <SearchableAnswerSelect
          disabled={!question.active}
          invalid={invalid}
          label={`Correct answer for question ${question.id}`}
          onChange={(answerId) => onAnswerChange(question.id, answerId)}
          options={options}
          type={question.type}
          value={value}
        />
        {invalidQuestionIds.has(question.id) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-300"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Select the correct answer.</p>
        )}
        {duplicatePodiumQuestionIds.has(question.id) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-300"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Choose a different podium driver.</p>
        )}
      </div>

      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${
        !question.active
          ? 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'
          : invalid
            ? 'border-red-400/30 bg-red-400/10 text-red-300'
            : value
              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
              : 'border-amber-400/35 bg-amber-400/10 text-amber-300'
      }`}>
        {value && question.active && !invalid && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
        {(unanswered || invalid) && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
        {!question.active ? 'Inactive Question' : invalid ? 'Needs Attention' : value ? 'Correct Answer Ready' : 'Awaiting Answer'}
      </span>
    </div>
  );
}

export default function ResultsScreen({ sprintWeekend }) {
  const [answers, setAnswers] = useState({});
  const [selectedRaceId, setSelectedRaceId] = useState(resultRaces[0].id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [scoringState, setScoringState] = useState('idle');
  const scoringTimerRef = useRef(null);
  const { isSprintWeekend, maximumPoints, questions } = sprintWeekend;
  const selectedRace = resultRaces.find((race) => race.id === selectedRaceId) ?? resultRaces[0];
  const roster = getAdminRosterForSeason(selectedRace.season);
  const standardQuestions = questions.filter((question) => !question.sprint);
  const sprintQuestions = questions.filter((question) => question.sprint);
  const activeQuestions = questions.filter((question) => question.active);
  const unansweredQuestionIds = useMemo(
    () => new Set(activeQuestions.filter((question) => !answers[question.id]).map((question) => question.id)),
    [activeQuestions, answers]
  );
  const duplicatePodiumQuestionIds = useMemo(() => {
    const podiumQuestions = podiumQuestionKeys
      .map((key) => questions.find((question) => question.key === key))
      .filter((question) => question?.active && answers[question.id]);
    const counts = podiumQuestions.reduce((result, question) => {
      const answerId = answers[question.id];
      result.set(answerId, (result.get(answerId) ?? 0) + 1);
      return result;
    }, new Map());

    return new Set(
      podiumQuestions
        .filter((question) => counts.get(answers[question.id]) > 1)
        .map((question) => question.id)
    );
  }, [answers, questions]);
  const invalidQuestionIds = validationAttempted ? unansweredQuestionIds : new Set();
  const hasUnansweredQuestions = unansweredQuestionIds.size > 0;
  const hasDuplicatePodiumDriver = duplicatePodiumQuestionIds.size > 0;
  const answeredCount = activeQuestions.filter((question) => answers[question.id]).length;

  useEffect(() => () => window.clearTimeout(scoringTimerRef.current), []);

  const handleAnswerChange = (questionId, answerId) => {
    setAnswers((current) => ({ ...current, [questionId]: answerId }));
    setReviewOpen(false);
  };

  const handleRaceChange = (event) => {
    setSelectedRaceId(Number(event.target.value));
    setAnswers({});
    setReviewOpen(false);
    setValidationAttempted(false);
    setConfirmationOpen(false);
    setScoringState('idle');
    window.clearTimeout(scoringTimerRef.current);
  };

  const answersAreValid = () => {
    setValidationAttempted(true);
    return !hasUnansweredQuestions && !hasDuplicatePodiumDriver;
  };

  const handleReviewResults = () => {
    if (!answersAreValid()) {
      setReviewOpen(false);
      return;
    }
    setReviewOpen((current) => !current);
  };

  const handleCalculateScores = () => {
    if (!answersAreValid()) return;
    setConfirmationOpen(true);
  };

  const runScoringPreview = (simulateError) => {
    setConfirmationOpen(false);
    setScoringState('loading');
    scoringTimerRef.current = window.setTimeout(() => {
      setScoringState(simulateError ? 'error' : 'success');
    }, 800);
  };

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Results Desk"
        title="Results & Scoring"
        description="Select demonstration correct answers and preview the scoring workflow. No RPC, database update, or real score calculation is performed."
        action={<DemoLabel>UI Prototype</DemoLabel>}
      />

      {scoringState === 'loading' && <div role="status" className="flex items-center gap-3 rounded-xl border border-blue-400/25 bg-blue-400/10 px-4 py-3 text-sm font-semibold text-blue-200"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Running demonstration scoring state…</div>}
      {scoringState === 'success' && <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Demo scoring preview completed. No scores were saved.</div>}
      {scoringState === 'error' && <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Demonstration error state: scoring was not performed.</div>}

      {(validationAttempted && hasUnansweredQuestions || hasDuplicatePodiumDriver) && (
        <div role="alert" aria-live="assertive" className="space-y-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
          {validationAttempted && hasUnansweredQuestions && <p>Select a correct answer for every active question before reviewing the results.</p>}
          {hasDuplicatePodiumDriver && <p>The same driver cannot occupy more than one podium position.</p>}
        </div>
      )}

      <Panel className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <label className="block min-w-0 text-sm font-bold text-zinc-200">
            <span className="mb-2 block">Race</span>
            <select className={inputClass} value={selectedRaceId} onChange={handleRaceChange}>
              {resultRaces.map((race) => <option key={race.id} value={race.id}>{race.name}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Submissions</p><p className="mt-1 font-display text-xl font-black text-white">94 <span className="text-xs text-zinc-500">Demo</span></p></div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Answered</p><p className="mt-1 font-display text-xl font-black text-white">{answeredCount} / {activeQuestions.length}</p></div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">Season {selectedRace.season} roster · {roster.drivers.length} drivers · {roster.constructors.length} constructors</p>
      </Panel>

      <Panel className="overflow-visible">
        <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Correct Answers</p><h3 className="mt-1 truncate font-display text-xl font-black uppercase text-white">{maximumPoints}-Point Result Sheet</h3></div>
          <DemoLabel />
        </div>
        <div className="space-y-3 bg-[#0d0d0f] p-3 sm:p-4">
          {standardQuestions.map((question) => (
            <AnswerRow
              key={question.id}
              answers={answers}
              duplicatePodiumQuestionIds={duplicatePodiumQuestionIds}
              invalidQuestionIds={invalidQuestionIds}
              onAnswerChange={handleAnswerChange}
              options={question.type === 'Driver' ? roster.drivers : roster.constructors}
              question={question}
            />
          ))}
        </div>
        {isSprintWeekend && (
          <>
            <div className="flex flex-wrap items-center gap-3 border-y border-yellow-400/20 bg-yellow-400/[0.07] px-5 py-3 sm:px-6">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Sprint Race Answers</span>
              <span className="h-px min-w-8 flex-1 bg-yellow-400/20" />
              <DemoLabel>Sprint</DemoLabel>
            </div>
            <div className="space-y-3 bg-[#0d0d0f] p-3 sm:p-4">
              {sprintQuestions.map((question) => (
                <AnswerRow
                  key={question.id}
                  answers={answers}
                  duplicatePodiumQuestionIds={duplicatePodiumQuestionIds}
                  invalidQuestionIds={invalidQuestionIds}
                  onAnswerChange={handleAnswerChange}
                  options={roster.drivers}
                  question={question}
                />
              ))}
            </div>
          </>
        )}
        <div className="flex flex-col gap-3 rounded-b-2xl border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={handleReviewResults} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"><ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Review Results</button>
          <button type="button" onClick={handleCalculateScores} disabled={scoringState === 'loading'} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">Calculate Scores</button>
        </div>
      </Panel>

      {reviewOpen && <Panel className="p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">Review Summary</p><p className="mt-2 text-sm text-zinc-300">All {activeQuestions.length} active correct answers are selected and ready for this local demo review.</p></div><CheckCircle2 className="h-6 w-6 shrink-0 text-yellow-400" aria-hidden="true" /></div></Panel>}

      <Modal open={confirmationOpen} onClose={() => setConfirmationOpen(false)} title="Calculate Demo Scores?" description="Confirmation is required before previewing the scoring state.">
        <p className="text-sm leading-6 text-zinc-300">A production workflow would compare 94 submissions with these {activeQuestions.length} correct answers. This prototype will not call an RPC or write any score.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={() => runScoringPreview(false)} className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Run Demo Scoring</button>
          <button type="button" onClick={() => runScoringPreview(true)} className="w-full rounded-xl border border-red-400/25 bg-red-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-red-300">Preview Error State</button>
          <button type="button" onClick={() => setConfirmationOpen(false)} className="w-full rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
