import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';

export const difficulties = [
  {
    id: 'soft',
    label: 'Soft',
    subtitle: 'Easy - 20 Questions',
    letter: 'S',
    ring: 'border-red-500',
    text: 'text-red-400',
    card: 'border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    bar: 'bg-red-500',
    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.25)]',
  },
  {
    id: 'medium',
    label: 'Medium',
    subtitle: 'Intermediate - 20 Questions',
    letter: 'M',
    ring: 'border-yellow-500',
    text: 'text-yellow-400',
    card: 'border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    bar: 'bg-yellow-500',
    glow: 'shadow-[0_0_24px_rgba(234,179,8,0.25)]',
  },
  {
    id: 'hard',
    label: 'Hard',
    subtitle: 'Difficult - 20 Questions',
    letter: 'H',
    ring: 'border-white',
    text: 'text-white',
    card: 'border-white/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]',
    bar: 'bg-white',
    glow: 'shadow-[0_0_24px_rgba(255,255,255,0.25)]',
  },
];

export function getDifficulty(id) {
  return difficulties.find((d) => d.id === id) ?? difficulties[0];
}

const viewMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
};

function BackButton({ onClick, label = 'Back to Games' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-300 backdrop-blur-md transition hover:border-yellow-500/50 hover:text-yellow-400"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TyreBadge({ difficulty, size = 'h-20 w-20', textSize = 'text-2xl' }) {
  return (
    <div
      className={`flex ${size} items-center justify-center rounded-full border-4 ${difficulty.ring} bg-zinc-950 font-display font-black ${textSize} ${difficulty.text} ${difficulty.glow}`}
    >
      {difficulty.letter}
    </div>
  );
}

export function DifficultySelect({ onSelect, onBack }) {
  return (
    <motion.div {...viewMotion}>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <BackButton onClick={onBack} />
        <h3 className="font-display text-2xl font-black uppercase tracking-[0.02em] text-white md:text-3xl">
          Choose Your Compound
        </h3>
        <p className="max-w-md text-sm leading-6 text-zinc-400">
          Pick a tyre compound to set the difficulty. Softer means easier — hards are for the true F1 masters.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {difficulties.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={`group flex flex-col items-center gap-5 rounded-2xl border bg-white/5 p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 ${d.card}`}
          >
            <TyreBadge difficulty={d} />
            <span className={`font-display text-xl font-black uppercase tracking-[0.2em] ${d.text}`}>
              {d.label}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {d.subtitle}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function QuizPlaying({ question, index, total, score, difficulty, onAnswer, onQuit }) {
  const EMPTY_ANSWER_STATE = {
    questionIndex: null,
    selectedOption: null,
    revealed: false,
  };
  const [answerState, setAnswerState] = useState(EMPTY_ANSWER_STATE);
  const transitionTimerRef = useRef(null);

  useEffect(() => {
    return () => window.clearTimeout(transitionTimerRef.current);
  }, []);

  const handleSelect = (option) => {
    if (answerState.revealed) return;

    setAnswerState({
      questionIndex: index,
      selectedOption: option,
      revealed: true,
    });

    clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      setAnswerState(EMPTY_ANSWER_STATE);
      onAnswer(option === question.answer);
    }, 750);
  };

  const canShowFeedback = answerState.revealed && answerState.questionIndex === index;

  const optionClass = (option) => {
    const base =
      'w-full rounded-xl border px-5 py-4 text-left text-sm font-medium leading-6 transition-all duration-200 md:text-base';

    if (!canShowFeedback) {
      return `${base} border-white/10 bg-white/5 text-zinc-200 backdrop-blur-md hover:bg-white/10 hover:border-white/20`;
    }
    if (option === question.answer) {
      return `${base} border-green-500/60 bg-green-500/15 text-green-300`;
    }
    if (option === answerState.selectedOption) {
      return `${base} border-red-500/60 bg-red-500/15 text-red-300`;
    }
    return `${base} border-white/5 bg-white/[0.02] text-zinc-500`;
  };

  return (
    <motion.div {...viewMotion} className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton onClick={onQuit} label="Quit Quiz" />
        <div className="flex items-center gap-3">
          <TyreBadge difficulty={difficulty} size="h-9 w-9" textSize="text-xs" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Score <span className="text-yellow-400">{score}</span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-10">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span>
              Question {index + 1} of {total}
            </span>
            <span className={difficulty.text}>{difficulty.label} Compound</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className={`h-full rounded-full ${difficulty.bar}`}
              initial={false}
              animate={{ width: `${((index + 1) / total) * 100}%` }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <motion.div
          key={question.question}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="font-display text-xl font-black leading-snug text-white md:text-2xl">
            {question.question}
          </h3>

          <div className="mt-8 flex flex-col gap-3">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={answerState.revealed}
                onClick={() => handleSelect(option)}
                className={optionClass(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function QuizResults({ score, total, difficulty, onPlayAgain, onBack }) {
  const percentage = Math.round((score / total) * 100);
  const verdict =
    percentage >= 80
      ? 'World Champion material! You own this grid.'
      : percentage >= 50
        ? 'Solid midfield points finish. Keep pushing!'
        : 'A tough race weekend — back to the sim for practice.';

  return (
    <motion.div {...viewMotion} className="mx-auto max-w-xl">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md md:p-12">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 text-yellow-300 shadow-[0_0_32px_rgba(250,204,21,0.25)]">
          <Trophy className="h-9 w-9" strokeWidth={1.75} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-400">
            <span className={difficulty.text}>{difficulty.label} Compound</span> — Race Complete
          </p>
          <h3 className="mt-3 font-display text-4xl font-black uppercase tracking-[0.02em] text-white md:text-5xl">
            You scored {score}/{total}
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{verdict}</p>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full ${difficulty.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-yellow-500/50 bg-yellow-400/10 py-2.5 text-sm font-semibold uppercase tracking-widest text-yellow-400 transition-all hover:bg-yellow-400/20"
          >
            <RotateCcw className="h-4 w-4" />
            Play Again
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] py-2.5 text-sm font-semibold uppercase tracking-widest text-zinc-200 transition-all hover:border-yellow-500/50 hover:text-yellow-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Games
          </button>
        </div>
      </div>
    </motion.div>
  );
}
