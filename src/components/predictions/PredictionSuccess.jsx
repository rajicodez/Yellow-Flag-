import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Home, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PredictionSuccess({ submissionTime, onBackToQuestions }) {
  const navigate = useNavigate();

  const formattedTime = new Date(submissionTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/30 bg-[#121212]/90 p-8 sm:p-12 shadow-[0_0_50px_rgba(250,204,21,0.1)] backdrop-blur-xl text-center"
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-400/20 border border-yellow-400/50 relative">
        <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400/20" />
        <Trophy className="h-12 w-12 text-yellow-400" />
      </div>

      <h2 className="font-display text-4xl sm:text-6xl font-black uppercase text-white leading-tight mb-4">
        Your Prediction<br />Has Been <span className="text-yellow-400">Submitted!</span>
      </h2>

      <p className="text-zinc-300 font-medium text-lg mb-2">
        Dutch Grand Prix
      </p>
      
      <p className="text-zinc-500 text-sm mb-8">
        Submitted on {formattedTime}
      </p>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-10 max-w-md w-full">
        <p className="text-sm text-zinc-300">
          You can edit your prediction until Qualifying Q1 begins.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row w-full max-w-md gap-4">
        <button
          onClick={onBackToQuestions}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-6 py-4 font-display font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
        >
          <Eye className="h-5 w-5" />
          View My Prediction
        </button>

        <button
          onClick={() => navigate('/')}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-4 font-display font-black uppercase tracking-widest text-black transition-transform hover:scale-[1.02]"
        >
          <Home className="h-5 w-5" />
          Back to Home
        </button>
      </div>
    </motion.div>
  );
}
