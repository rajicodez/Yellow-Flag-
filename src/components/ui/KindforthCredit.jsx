import { ExternalLink } from 'lucide-react';
import { studio } from '../../data/content';

export default function KindforthCredit({
  label = 'Prediction platform by',
  className = '',
  compact = false,
}) {
  return (
    <a
      href={studio.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} ${studio.name} — visit website`}
      className={`font-poppins group inline-flex w-fit items-center gap-2 text-left ${compact ? 'py-1 text-xs sm:text-sm' : 'py-1.5 text-sm'} font-medium text-zinc-300 transition duration-300 hover:text-white focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${className}`}
    >
      <span>
        {label}{' '}
        <strong className="font-bold text-yellow-300 underline decoration-yellow-400/30 underline-offset-4 transition group-hover:text-yellow-200 group-hover:decoration-yellow-300">
          {studio.name}
        </strong>
      </span>
      <ExternalLink className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0 text-yellow-400/70 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-yellow-300`} aria-hidden="true" />
    </a>
  );
}
