import { useState } from 'react';
import { CircleHelp, GripVertical, Pencil, Plus } from 'lucide-react';
import { DemoLabel, Field, inputClass, Modal, Panel, ScreenHeading } from '../AdminUI';
import { dutchGrandPrixQuestions } from '../data';

function QuestionModal({ question, open, onClose, onDemoSave }) {
  const editing = Boolean(question);
  const handleSubmit = (event) => {
    event.preventDefault();
    onDemoSave(editing ? 'Question edit preview saved locally. No database row changed.' : 'Question create preview completed. The seven-question set remains unchanged.');
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Question' : 'Add Question'} description="UI-only question editor. No Supabase write will occur." size="lg">
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <Field label="Question key" hint="Stable key used by the future scoring system.">
          <input className={inputClass} defaultValue={question?.key ?? ''} placeholder="question_key" required />
        </Field>
        <Field label="Answer type">
          <select className={inputClass} defaultValue={question?.type ?? 'Driver'}><option>Driver</option><option>Constructor</option></select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Question text"><textarea rows="3" className={inputClass} defaultValue={question?.text ?? ''} placeholder="Enter the prediction question" required /></Field>
        </div>
        <Field label="Points"><input type="number" min="1" max="1" className={inputClass} defaultValue="1" /></Field>
        <Field label="Status"><select className={inputClass} defaultValue={question?.active === false ? 'Inactive' : 'Active'}><option>Active</option><option>Inactive</option></select></Field>
        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300">Cancel</button>
          <button type="submit" className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black">Save Demo Question</button>
        </div>
      </form>
    </Modal>
  );
}

export default function QuestionsScreen() {
  const [questions, setQuestions] = useState(dutchGrandPrixQuestions);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const openAdd = () => {
    setSelectedQuestion(null);
    setModalOpen(true);
  };

  const openEdit = (question) => {
    setSelectedQuestion(question);
    setModalOpen(true);
  };

  const toggleQuestion = (id) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, active: !question.active } : question));
    setNotice('Question status changed in local demo state only.');
  };

  const handleDemoSave = (message) => {
    setModalOpen(false);
    setNotice(message);
  };

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Dutch Grand Prix"
        title="Questions"
        description="Manage the ordered seven-question prediction set for Circuit Zandvoort. Controls are visual and local to this page."
        action={<button type="button" onClick={openAdd} className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black focus:outline-none focus:ring-2 focus:ring-yellow-200"><Plus className="h-4 w-4" aria-hidden="true" /> Add Question</button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5"><p className="text-xs font-bold text-zinc-500">Total questions</p><p className="mt-2 font-display text-3xl font-black text-white">7</p><div className="mt-3"><DemoLabel /></div></Panel>
        <Panel className="p-5"><p className="text-xs font-bold text-zinc-500">Maximum points</p><p className="mt-2 font-display text-3xl font-black text-white">7</p><p className="mt-2 text-xs text-zinc-500">One point per correct answer</p></Panel>
        <Panel className="p-5"><p className="text-xs font-bold text-zinc-500">Active questions</p><p className="mt-2 font-display text-3xl font-black text-white">{questions.filter((question) => question.active).length}</p><p className="mt-2 text-xs text-zinc-500">Local demo state</p></Panel>
      </div>

      {notice && <div role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">{notice}</div>}

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-400">Question Order</p><h3 className="mt-1 font-display text-xl font-black uppercase text-white">Zandvoort Prediction Set</h3></div>
          <DemoLabel />
        </div>
        <ol className="divide-y divide-white/10">
          {questions.map((question) => (
            <li key={question.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-center gap-3">
                <button type="button" aria-label={`Reorder question ${question.id}`} className="cursor-grab rounded-lg p-2 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
                  <GripVertical className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/25 bg-yellow-400/10 font-display text-sm font-black text-yellow-300">Q{question.id}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md bg-black/35 px-2 py-1 text-[10px] text-zinc-500">{question.key}</code>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">{question.type}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">1 Point</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">{question.text}</p>
              </div>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <button
                  type="button"
                  role="switch"
                  aria-checked={question.active}
                  aria-label={`${question.active ? 'Deactivate' : 'Activate'} question ${question.id}`}
                  onClick={() => toggleQuestion(question.id)}
                  className={`relative h-7 w-12 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-yellow-400/50 ${question.active ? 'border-yellow-400/40 bg-yellow-400' : 'border-white/15 bg-zinc-800'}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full transition ${question.active ? 'left-7 bg-black' : 'left-1 bg-zinc-400'}`} />
                </button>
                <button type="button" onClick={() => openEdit(question)} aria-label={`Edit question ${question.id}`} className="rounded-lg border border-white/10 p-2.5 text-zinc-400 transition hover:border-yellow-400/35 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2 border-t border-white/10 bg-black/20 px-5 py-4 text-xs text-zinc-500"><CircleHelp className="h-4 w-4 text-yellow-400" aria-hidden="true" /> Reorder handles are visual in this prototype.</div>
      </Panel>

      <QuestionModal question={selectedQuestion} open={modalOpen} onClose={() => setModalOpen(false)} onDemoSave={handleDemoSave} />
    </div>
  );
}
