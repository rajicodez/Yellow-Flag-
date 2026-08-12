import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DriverOptionCard({ driver, isSelected, onSelect }) {
  // Use a fallback generic team color if not found (or based on string matching)
  // Yellow Flag uses generic yellow for highlighting
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(driver)}
      className={`relative flex w-full flex-col overflow-hidden rounded-xl border text-left transition-all
        ${isSelected 
          ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]' 
          : 'border-white/10 bg-[#121212] hover:border-white/30 hover:bg-white/5'}
      `}
    >
      <div className="flex h-24 sm:h-32 w-full items-end justify-center bg-zinc-900/50 pt-4 overflow-hidden relative">
        {driver.avatarUrl ? (
          <img 
            src={driver.avatarUrl} 
            alt={driver.name} 
            className="h-full w-auto object-contain drop-shadow-xl"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-zinc-800" />
        )}
        
        {/* Number overlay */}
        <div className="absolute top-2 left-2 text-4xl sm:text-5xl font-black italic text-white/5 font-display">
          {driver.id}
        </div>
      </div>
      
      <div className="flex flex-col p-3 sm:p-4 border-t border-white/5 relative z-10">
        <span className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
          {driver.name}
        </span>
        <span className="text-xs font-medium text-zinc-400 mt-1 uppercase tracking-widest">
          {driver.team}
        </span>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg">
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
      )}
    </motion.button>
  );
}
