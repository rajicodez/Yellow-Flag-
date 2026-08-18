import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeamOptionCard({ team, isSelected, onSelect }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(team)}
      className={`relative flex w-full flex-col overflow-hidden rounded-xl border text-left transition-all p-4 sm:p-6
        ${isSelected 
          ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]' 
          : 'border-white/10 bg-[#121212] hover:border-white/30 hover:bg-white/5'}
      `}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 p-2 border border-white/5">
          {team.logoUrl ? (
            <img 
              src={team.logoUrl} 
              alt={team.name} 
              className={`max-h-full max-w-full object-contain ${team.invertLogo ? 'invert opacity-90' : ''}`}
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-zinc-800" />
          )}
        </div>
        
        <div className="flex flex-col">
          <span className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
            {team.name}
          </span>
          <span className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-widest line-clamp-1">
            {team.engine}
          </span>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
      )}
    </motion.button>
  );
}
