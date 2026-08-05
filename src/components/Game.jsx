import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Gamepad2, Timer } from 'lucide-react';
import { quizQuestions } from '../data/quiz';
import F1Racer from './F1Racer';
import ReactionTimer from './ReactionTimer';
import { DifficultySelect, QuizPlaying, QuizResults, getDifficulty } from './Quiz';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

const games = [
  {
    id: 'quiz',
    icon: Brain,
    title: 'F1 Master Quiz',
    description: 'Test your ultimate Formula 1 knowledge.',
    playable: true,
  },
  {
    id: 'racer',
    icon: Gamepad2,
    title: 'F1 Racer',
    description: 'Hit the apex in our exclusive web-based mini-game.',
    playable: true,
  },
  {
    id: 'reaction',
    icon: Timer,
    title: 'Reaction Timer',
    description: 'Five red lights! Test your reflexes against the current grid.',
    playable: true,
  },
];

function GameCard({ icon: Icon, title, description, playable, onPlay }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(255,255,0,0.15)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-yellow-400/25 bg-yellow-400/10 text-yellow-300 shadow-[0_0_24px_rgba(250,204,21,0.15)] transition duration-300 group-hover:shadow-[0_0_32px_rgba(250,204,21,0.3)]">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>

      <h3 className="mt-5 font-display text-xl font-black uppercase tracking-[0.02em] text-white">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-zinc-300">{description}</p>

      <button
        type="button"
        onClick={playable ? onPlay : undefined}
        className="mt-6 w-full rounded-full border border-white/10 bg-[#1a1a1a] py-2.5 text-sm font-semibold uppercase tracking-widest text-zinc-200 transition-all hover:border-yellow-500/50 hover:text-yellow-500"
      >
        Play Now
      </button>
    </article>
  );
}

export default function Game() {
  const [activeView, setActiveView] = useState('menu');
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);

  const questions = selectedDifficulty ? quizQuestions[selectedDifficulty] : [];
  const difficulty = getDifficulty(selectedDifficulty);

  const startQuiz = (difficultyId) => {
    setSelectedDifficulty(difficultyId);
    setCurrentQuestionIndex(0);
    setScore(0);
    setActiveView('playing');
  };

  const backToMenu = () => {
    setActiveView('menu');
    setSelectedDifficulty(null);
    setCurrentQuestionIndex(0);
    setScore(0);
  };

  const handleAnswer = useCallback((isCorrect) => {
    if (isCorrect) setScore((s) => s + 1);
    setCurrentQuestionIndex((i) => {
      const next = i + 1;
      if (next >= 20) {
        setActiveView('results');
        return i;
      }
      return next;
    });
  }, []);

  return (
    <section id="game" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="Fan Zone Games"
          title="GAMES"
          description="Take on the Yellow Flag challenges — quiz your F1 knowledge, race for the apex, and beat the lights."
        />

        <AnimatePresence mode="wait">
          {activeView === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
            >
              {games.map((game, index) => (
                <Reveal key={game.id} delay={index * 0.1} className="h-full">
                  <GameCard
                    {...game}
                    onPlay={() =>
                      setActiveView(
                        { quiz: 'quiz-select', racer: 'racer', reaction: 'reaction' }[game.id]
                      )
                    }
                  />
                </Reveal>
              ))}
            </motion.div>
          )}

          {activeView === 'quiz-select' && (
            <DifficultySelect key="quiz-select" onSelect={startQuiz} onBack={backToMenu} />
          )}

          {activeView === 'racer' && <F1Racer key="racer" onExit={backToMenu} />}

          {activeView === 'reaction' && <ReactionTimer key="reaction" onExit={backToMenu} />}

          {activeView === 'playing' && questions.length > 0 && (
            <QuizPlaying
              key="playing"
              question={questions[currentQuestionIndex]}
              index={currentQuestionIndex}
              total={questions.length}
              score={score}
              difficulty={difficulty}
              onAnswer={handleAnswer}
              onQuit={backToMenu}
            />
          )}

          {activeView === 'results' && (
            <QuizResults
              key="results"
              score={score}
              total={questions.length || 20}
              difficulty={difficulty}
              onPlayAgain={() => startQuiz(selectedDifficulty)}
              onBack={backToMenu}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
