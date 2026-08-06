import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import DriverOptionCard from './DriverOptionCard';
import TeamOptionCard from './TeamOptionCard';
import { driversData } from '../../data/drivers';
import { f1Teams2026 } from '../../data/teams';

export default function PredictionQuestionCard({ 
  question, 
  currentAnswer, 
  onAnswer, 
  onNext, 
  onPrev, 
  isFirst, 
  isLast,
  validationError
}) {
  
  const handleSelectDriver = (driverName) => {
    onAnswer(question.id, driverName);
  };

  const handleSelectTeam = (teamName) => {
    onAnswer(question.id, teamName);
  };

  const handleSelectOption = (option) => {
    onAnswer(question.id, option);
  };

  // Variant for Framer Motion to slide questions
  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-sm">
      
      {/* Question Header */}
      <div className="mb-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <span className="font-display text-xs font-bold tracking-widest uppercase rounded bg-yellow-400/10 px-2 py-1">
            {question.category}
          </span>
        </div>
        <h3 className="font-display text-2xl sm:text-4xl font-black text-white uppercase leading-tight mb-2">
          {question.title}
        </h3>
        <p className="text-zinc-400 font-medium tracking-wide">
          {question.instruction}
        </p>

        {/* Validation Error */}
        <AnimatePresence>
          {validationError && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mt-4 flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-red-500"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold">{validationError}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question Options Content */}
      <div className="flex-1 min-h-[400px]">
        {question.type === 'driver' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {question.allowNoRetirements && (
              <button
                onClick={() => handleSelectOption('No Retirements')}
                className={`col-span-full mb-2 relative flex w-full items-center justify-center p-4 rounded-xl border transition-all ${
                  currentAnswer === 'No Retirements'
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                    : 'border-white/10 bg-white/5 text-white hover:border-white/30'
                }`}
              >
                <span className="font-display font-bold uppercase tracking-widest">No Retirements</span>
              </button>
            )}
            
            {driversData.map(driver => (
              <DriverOptionCard 
                key={driver.id} 
                driver={driver} 
                isSelected={currentAnswer === driver.name}
                onSelect={(d) => handleSelectDriver(d.name)}
              />
            ))}
          </div>
        )}

        {question.type === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {f1Teams2026.map(team => (
              <TeamOptionCard 
                key={team.id} 
                team={team} 
                isSelected={currentAnswer === team.name}
                onSelect={(t) => handleSelectTeam(t.name)}
              />
            ))}
          </div>
        )}

        {question.type === 'options' && (
          <div className="flex flex-col gap-3">
            {question.options.map(option => (
              <button
                key={option}
                onClick={() => handleSelectOption(option)}
                className={`relative flex w-full items-center p-5 rounded-xl border transition-all ${
                  currentAnswer === option
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                    : 'border-white/10 bg-white/5 text-white hover:border-white/30'
                }`}
              >
                <div className={`mr-4 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                  currentAnswer === option ? 'border-yellow-400' : 'border-zinc-500'
                }`}>
                  {currentAnswer === option && <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />}
                </div>
                <span className="font-display text-lg font-bold tracking-widest uppercase">{option}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className={`flex items-center gap-2 px-6 py-3 font-display font-bold uppercase tracking-widest transition-colors ${
            isFirst ? 'text-zinc-600 cursor-not-allowed' : 'text-white hover:text-yellow-400'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </button>

        <button
          onClick={onNext}
          className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-8 py-3 font-display font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]"
        >
          {isLast ? 'Review' : 'Next'}
          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
        </button>
      </div>

    </div>
  );
}
