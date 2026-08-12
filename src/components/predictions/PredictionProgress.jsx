import React from 'react';
import { motion } from 'framer-motion';

export default function PredictionProgress({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  answeredQuestionNumbers,
  onNavigate
}) {
  const remainingQuestions = totalQuestions - answeredQuestions;
  const percentage = totalQuestions > 0
    ? Math.round((answeredQuestions / totalQuestions) * 100)
    : 0;

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-sm font-bold tracking-widest text-zinc-400 uppercase">
          Question {currentQuestion} of {totalQuestions}
        </span>
        <span className="font-display text-sm font-bold text-yellow-400">{percentage}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <motion.div 
          className="h-full bg-yellow-400"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <span className="sr-only">
        {answeredQuestions} answered, {remainingQuestions} remaining
      </span>

      {/* Number Indicators */}
      <div className="mt-4 flex justify-between gap-1 sm:gap-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const num = idx + 1;
          const isCurrent = num === currentQuestion;
          const isCompleted = answeredQuestionNumbers.includes(num) && !isCurrent;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <button
              key={num}
              disabled={isUpcoming}
              onClick={() => {
                if (isCompleted || isCurrent) {
                  onNavigate(num);
                }
              }}
              className={`flex h-6 flex-1 items-center justify-center rounded-sm border text-[10px] font-bold sm:h-8 sm:text-xs transition-colors
                ${isCompleted ? 'bg-yellow-400 border-yellow-400 text-black hover:bg-yellow-500' : ''}
                ${isCurrent ? 'bg-transparent border-yellow-400 text-yellow-400' : ''}
                ${isUpcoming ? 'bg-zinc-800 border-zinc-800 text-zinc-600 cursor-not-allowed' : ''}
              `}
              aria-label={`Go to question ${num}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
