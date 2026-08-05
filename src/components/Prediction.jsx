import { motion } from 'framer-motion';
import { BarChart2, HelpCircle, Star, Trophy, ChevronsRight } from 'lucide-react';
import Reveal from './ui/Reveal';

export default function Prediction() {
  return (
    <section id="prediction" className="relative py-16 md:py-24">
      {/* Background accents similar to other sections */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 lg:items-center">
          
          {/* Left Column: Prediction Info & CTA */}
          <Reveal className="flex flex-col items-start">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-black">
              <BarChart2 className="h-4 w-4" strokeWidth={3} />
              Race Predictions Are Open
            </div>

            {/* Title */}
            <h2 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-[0.02em] text-white md:text-7xl">
              Dutch Grand Prix<br />
              <span className="text-yellow-400">Prediction</span>
            </h2>

            {/* Circuit Name & Flag */}
            <div className="mt-4 flex items-center gap-3 font-display text-xl font-bold uppercase tracking-widest text-zinc-400">
              Circuit Zandvoort
              <img 
                src="https://flagcdn.com/w40/nl.png" 
                srcSet="https://flagcdn.com/w80/nl.png 2x" 
                width="24" 
                height="16" 
                alt="Netherlands Flag" 
                className="rounded-sm shadow-sm"
              />
            </div>

            {/* Countdown Timer */}
            <div className="mt-8 flex w-full max-w-md items-center justify-between rounded-xl border border-white/10 bg-[#121212] py-4 px-6 md:px-10">
              <div className="flex flex-col items-center">
                <span className="font-display text-4xl font-black leading-none text-white md:text-5xl">02</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Days</span>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="font-display text-4xl font-black leading-none text-white md:text-5xl">14</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Hours</span>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="font-display text-4xl font-black leading-none text-white md:text-5xl">35</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Min</span>
              </div>
            </div>

            {/* CTA Button */}
            <button className="group mt-6 flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 py-4 font-display text-lg font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              Make Your Prediction
              <ChevronsRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
            </button>

            {/* Closing Note */}
            <p className="mt-4 w-full max-w-md text-center text-sm italic text-zinc-500">
              Predictions close when Qualifying Q1 begins
            </p>
          </Reveal>

          {/* Right Column: Cards */}
          <Reveal delay={0.2} className="flex flex-col gap-6">
            
            {/* Circuit Outline & Stats Card */}
            <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-6 sm:flex-row sm:p-8">
              {/* Grid Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
              
              {/* Zandvoort SVG Outline (Approximate placeholder path) */}
              <div className="relative flex-1 p-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                <svg viewBox="0 0 300 200" className="w-full h-auto max-w-[280px]">
                  <path 
                    d="M 50 120 C 30 110, 20 80, 40 50 C 60 20, 100 30, 120 50 L 150 70 L 170 50 C 190 30, 220 20, 250 30 C 280 40, 290 70, 260 100 L 210 130 C 190 140, 150 150, 120 120 L 90 90 L 70 140 C 60 160, 40 160, 50 120 Z" 
                    fill="none" 
                    stroke="#FBBF24" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  {/* Start/Finish Line Indicator */}
                  <g transform="translate(145, 145) rotate(-20)">
                    <rect x="0" y="0" width="4" height="4" fill="white" />
                    <rect x="4" y="0" width="4" height="4" fill="black" />
                    <rect x="0" y="4" width="4" height="4" fill="black" />
                    <rect x="4" y="4" width="4" height="4" fill="white" />
                    <rect x="8" y="0" width="4" height="4" fill="white" />
                    <rect x="12" y="0" width="4" height="4" fill="black" />
                    <rect x="8" y="4" width="4" height="4" fill="black" />
                    <rect x="12" y="4" width="4" height="4" fill="white" />
                    <rect x="-4" y="0" width="4" height="4" fill="black" />
                    <rect x="-4" y="4" width="4" height="4" fill="white" />
                  </g>
                </svg>
              </div>

              {/* Stats Column */}
              <div className="relative mt-8 flex w-full flex-row justify-around gap-4 sm:mt-0 sm:w-auto sm:flex-col">
                <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-400">
                    <HelpCircle className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-black leading-none text-white">10</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Questions</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-yellow-400/25 bg-yellow-400/10 text-yellow-400">
                    <Star className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-black leading-none text-white">Max 25</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-400">Points</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hosts Championship Card */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Trophy className="h-5 w-5 text-yellow-400" strokeWidth={2} />
                  <span className="font-display text-lg font-bold uppercase tracking-wider">Hosts Championship</span>
                </div>
                {/* Red Dots Pattern */}
                <div className="flex gap-1.5 opacity-50">
                  <div className="grid grid-cols-5 gap-1.5">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4 sm:gap-8">
                {/* Lakindu Score */}
                <div className="flex flex-col items-end">
                  <span className="font-display text-lg font-bold uppercase tracking-widest text-zinc-400 sm:text-xl">Lakindu</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-black text-yellow-400 sm:text-6xl">68</span>
                    <span className="font-display font-bold text-zinc-500">PTS</span>
                  </div>
                </div>

                {/* VS Badge */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-800 bg-zinc-900 shadow-inner">
                  <span className="font-display text-xl font-black text-zinc-400">VS</span>
                  {/* Decorative parentheses */}
                  <span className="absolute -left-6 text-4xl font-light text-yellow-400/30">)</span>
                  <span className="absolute -right-6 text-4xl font-light text-red-600/30">(</span>
                </div>

                {/* Kasun Score */}
                <div className="flex flex-col items-start">
                  <span className="font-display text-lg font-bold uppercase tracking-widest text-zinc-400 sm:text-xl">Kasun</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-black text-red-600 sm:text-6xl">72</span>
                    <span className="font-display font-bold text-zinc-500">PTS</span>
                  </div>
                </div>
              </div>
            </div>

          </Reveal>
        </div>
      </div>
    </section>
  );
}
