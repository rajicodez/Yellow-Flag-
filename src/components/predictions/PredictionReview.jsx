import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { driversData } from '../../data/drivers';
import { f1Teams2026 } from '../../data/teams';

export default function PredictionReview({ answers, questions, onSubmit, onEdit, isSubmitting }) {
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter(q => Boolean(answers[q.id])).length;
  
  const getAnswerDisplay = (questionId, answer) => {
    const question = questions.find(q => q.id === questionId);
    
    let imageUrl = null;
    let label = answer || 'Not answered';

    if (question?.type === 'driver' && answer) {
      const driver = driversData.find(d => d.name === answer);
      if (driver) imageUrl = driver.avatarUrl;
    } else if (question?.type === 'team' && answer) {
      const team = f1Teams2026.find(t => t.name === answer);
      if (team) imageUrl = team.logoUrl;
    }

    return { label, imageUrl };
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-sm">
      
      {/* Review Header */}
      <div className="mb-8 text-center border-b border-white/10 pb-8">
        <div className="inline-flex items-center justify-center rounded-full bg-yellow-400/20 p-3 mb-4">
          <ShieldCheck className="h-8 w-8 text-yellow-400" />
        </div>
        <h3 className="font-display text-3xl sm:text-5xl font-black text-white uppercase leading-tight mb-2">
          Review Your Prediction
        </h3>
        <p className="text-zinc-400 font-medium tracking-wide">
          {answeredQuestions} of {totalQuestions} answered • Max 7 Points
        </p>
      </div>

      {/* Answers List */}
      <div className="flex flex-col gap-4 mb-8">
        {questions.map((q, index) => {
          const answer = answers[q.id];
          const display = getAnswerDisplay(q.id, answer);

          return (
            <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 gap-4">
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-1 block">
                  {index + 1}. {q.shortTitle}
                </span>
                <span className="font-display text-lg sm:text-xl font-bold text-white">
                  {q.title}
                </span>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4 flex-1">
                <div className="flex items-center gap-3">
                  {display.imageUrl && (
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-zinc-900 rounded-lg p-1 border border-white/10 flex items-center justify-center shrink-0">
                      <img src={display.imageUrl} alt={display.label} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <span className="font-display text-lg sm:text-xl font-black text-white uppercase">
                    {display.label}
                  </span>
                </div>
                
                <button
                  onClick={() => onEdit(index + 1)}
                  className="p-2 text-zinc-400 hover:text-yellow-400 transition-colors"
                  aria-label={`Edit question ${index + 1}`}
                >
                  <Edit2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
        <button
          onClick={() => onEdit(totalQuestions)}
          className="flex-1 px-6 py-4 rounded-xl border border-white/20 bg-transparent font-display font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5"
        >
          Back to Questions
        </button>

        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="group flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-8 py-4 font-display font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] disabled:opacity-70 disabled:hover:scale-100"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Prediction'}
          {!isSubmitting && <CheckCircle2 className="h-5 w-5" strokeWidth={3} />}
        </button>
      </div>

    </div>
  );
}
