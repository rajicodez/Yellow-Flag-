import Reveal from './Reveal';

export default function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  const alignClass = align === 'left' ? 'text-left mx-0' : 'text-center mx-auto';

  return (
    <Reveal className={`mb-12 max-w-2xl ${alignClass}`}>
      <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-yellow-300">
        <span className="h-px w-6 bg-yellow-400/60" />
        {eyebrow}
        <span className="h-px w-6 bg-yellow-400/60" />
      </div>
      <h2 className="font-display text-3xl font-black uppercase leading-none tracking-[0.02em] text-white md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-7 text-zinc-300 md:text-lg ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-xl'}`}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
