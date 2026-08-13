import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { DemoLabel, inputClass, Modal, Panel, ScreenHeading } from '../AdminUI';
import { constructorOptions, driverOptions } from '../data';

function AnswerRow({ answers, question, setAnswers }) {
  const options = question.type === 'Driver' ? driverOptions : constructorOptions;
  const value = answers[question.id] ?? '';

  return (
    <div className={`grid min-w-0 gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)_auto] lg:items-center ${question.sprint ? 'bg-yellow-400/[0.025]' : ''}`}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-display text-sm font-black text-yellow-300">Q{question.id}</span>
          <code className="max-w-full break-all text-[10px] text-zinc-600">{question.key}</code>
          {question.sprint && <DemoLabel>Sprint</DemoLabel>}
        </div>
        <p className="mt-2 break-words text-sm font-semibold leading-6 text-white">{question.text}</p>
        <p className="mt-1 text-xs text-zinc-500">1 point per correct answer</p>
      </div>
      <label className="block min-w-0">
        <span className="sr-only">Correct answer for question {question.id}</span>
        <select value={value} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className={inputClass}>
          <option value="">Select correct answer</option>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] ${value ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-zinc-500'}`}>
        {value && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
        {value ? 'Correct Answer Ready' : 'Awaiting Answer'}
      </span>
    </div>
  );
}

export default function ResultsScreen({ sprintWeekend }) {
  const [answers, setAnswers] = useState({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [scoringState, setScoringState] = useState('idle');
  const scoringTimerRef = useRef(null);
  const { isSprintWeekend, maximumPoints, questions, totalQuestions } = sprintWeekend;
  const standardQuestions = questions.filter((question) => !question.sprint);
  const sprintQuestions = questions.filter((question) => question.sprint);

  useEffect(() => () => window.clearTimeout(scoringTimerRef.current), []);

  const answeredCount = questions.filter((question) => answers[question.id]).length;

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

      <Panel className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <label className="block min-w-0 text-sm font-bold text-zinc-200"><span className="mb-2 block">Race</span><select className={inputClass} defaultValue="Dutch Grand Prix"><option>Dutch Grand Prix</option><option>Hungarian Grand Prix</option><option>British Grand Prix</option></select></label>
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Submissions</p><p className="mt-1 font-display text-xl font-black text-white">94 <span className="text-xs text-zinc-500">Demo</span></p></div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-5 py-3"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Answered</p><p className="mt-1 font-display text-xl font-black text-white">{answeredCount} / {totalQuestions}</p></div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Correct Answers</p><h3 className="mt-1 truncate font-display text-xl font-black uppercase text-white">{maximumPoints}-Point Result Sheet</h3></div>
          <DemoLabel />
        </div>
        <div className="divide-y divide-white/10">
          {standardQuestions.map((question) => <AnswerRow key={question.id} answers={answers} question={question} setAnswers={setAnswers} />)}
        </div>
        {isSprintWeekend && (
          <>
            <div className="flex flex-wrap items-center gap-3 border-y border-yellow-400/20 bg-yellow-400/[0.07] px-5 py-3 sm:px-6">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Sprint Race Answers</span>
              <span className="h-px min-w-8 flex-1 bg-yellow-400/20" />
              <DemoLabel>Sprint</DemoLabel>
            </div>
            <div className="divide-y divide-white/10">
              {sprintQuestions.map((question) => <AnswerRow key={question.id} answers={answers} question={question} setAnswers={setAnswers} />)}
            </div>
          </>
        )}
        <div className="flex flex-col gap-3 border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button type="button" onClick={() => setReviewOpen((current) => !current)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"><ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Review Results</button>
          <button type="button" onClick={() => setConfirmationOpen(true)} disabled={scoringState === 'loading'} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">Calculate Scores</button>
        </div>
      </Panel>

      {reviewOpen && <Panel className="p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">Review Summary</p><p className="mt-2 text-sm text-zinc-300">{answeredCount} of {totalQuestions} correct answers are selected. This review is local demo state only.</p></div><CheckCircle2 className="h-6 w-6 shrink-0 text-yellow-400" aria-hidden="true" /></div></Panel>}

      <Modal open={confirmationOpen} onClose={() => setConfirmationOpen(false)} title="Calculate Demo Scores?" description="Confirmation is required before previewing the scoring state.">
        <p className="text-sm leading-6 text-zinc-300">A production workflow would compare 94 submissions with these {totalQuestions} correct answers. This prototype will not call an RPC or write any score.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={() => runScoringPreview(false)} className="w-full rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Run Demo Scoring</button>
          <button type="button" onClick={() => runScoringPreview(true)} className="w-full rounded-xl border border-red-400/25 bg-red-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-red-300">Preview Error State</button>
          <button type="button" onClick={() => setConfirmationOpen(false)} className="w-full rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
