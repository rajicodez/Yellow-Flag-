import { ExternalLink } from 'lucide-react';
import { studio } from '../../data/content';

export default function KindforthCredit({
  label = 'Prediction experience powered by',
  className = '',
  compact = false,
}) {
  return (
    <a
      href={studio.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} ${studio.name} — visit website`}
      className={`group inline-flex w-fit items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.035] ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} text-left shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-yellow-400/35 hover:bg-yellow-400/[0.07] hover:shadow-[0_12px_34px_rgba(250,204,21,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${className}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 font-display font-black text-yellow-300 transition group-hover:bg-yellow-400 group-hover:text-black ${compact ? 'h-7 w-7 text-[11px]' : 'h-8 w-8 text-xs'}`} aria-hidden="true">
        K
      </span>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-zinc-500`}>
        {label} <strong className="font-black text-zinc-200 transition group-hover:text-yellow-300">{studio.name}</strong>
      </span>
      <ExternalLink className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-yellow-300`} aria-hidden="true" />
    </a>
  );
}
