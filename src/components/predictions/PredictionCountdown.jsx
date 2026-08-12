import React, { useState, useEffect } from 'react';

export default function PredictionCountdown({ closeTime, onComplete }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(closeTime) - new Date();
      
      if (difference <= 0) {
        setIsClosed(true);
        if (onComplete) onComplete();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [closeTime, onComplete]);

  const pad = (num) => num.toString().padStart(2, '0');

  if (isClosed) {
    return (
      <div className="w-full rounded-xl border border-red-500/30 bg-red-950/40 py-6 px-6 text-center shadow-[0_0_20px_rgba(220,38,38,0.15)] backdrop-blur-md sticky top-24 z-40">
        <h3 className="font-display text-3xl font-black uppercase text-red-500 md:text-4xl">Predictions Closed</h3>
        <p className="mt-2 text-sm font-bold tracking-widest text-zinc-300">Predictions are now closed</p>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#121212]/80 py-4 px-4 md:px-10 shadow-lg backdrop-blur-md sticky top-24 z-40">
      <div className="flex flex-col items-center flex-1">
        <span className="font-display text-3xl font-black leading-none text-white md:text-5xl">{pad(timeLeft.days)}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-yellow-400 md:text-xs">Days</span>
      </div>
      <div className="h-10 w-px bg-white/10 md:h-12"></div>
      <div className="flex flex-col items-center flex-1">
        <span className="font-display text-3xl font-black leading-none text-white md:text-5xl">{pad(timeLeft.hours)}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-yellow-400 md:text-xs">Hours</span>
      </div>
      <div className="h-10 w-px bg-white/10 md:h-12"></div>
      <div className="flex flex-col items-center flex-1">
        <span className="font-display text-3xl font-black leading-none text-white md:text-5xl">{pad(timeLeft.minutes)}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-yellow-400 md:text-xs">Min</span>
      </div>
      <div className="h-10 w-px bg-white/10 md:h-12"></div>
      <div className="flex flex-col items-center flex-1">
        <span className="font-display text-3xl font-black leading-none text-white md:text-5xl">{pad(timeLeft.seconds)}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-yellow-400 md:text-xs">Sec</span>
      </div>
    </div>
  );
}
