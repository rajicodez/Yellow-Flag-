import { timelineItems } from '../data/content';
import Reveal from './ui/Reveal';
import SectionHeading from './ui/SectionHeading';

export default function Journey() {
  return (
    <section id="journey" className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent md:block" />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="Journey"
          title="The Yellow Flag Timeline"
          description="From a simple idea to a growing Sinhala F1 community — every lap tells a story."
        />

        <div className="relative">
          <div className="absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-yellow-400/10 via-yellow-400/40 to-yellow-400/10 md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-8">
            {timelineItems.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08}>
                <div className={`relative grid gap-6 md:grid-cols-2 md:items-center ${index % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''}`}>
                  <div className={`${index % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <span className="font-display text-5xl font-black text-yellow-400/20">{item.year}</span>
                  </div>

                  <article className="relative rounded-[1.75rem] border border-white/10 bg-black/40 p-6 backdrop-blur-xl md:p-7">
                    <span className="absolute -left-[1.65rem] top-8 hidden h-4 w-4 rounded-full border-4 border-black bg-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.8)] md:block md:-translate-x-1/2 md:left-1/2" />
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-300">Checkpoint {item.year}</p>
                    <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-[0.03em] text-white">{item.title}</h3>
                    <p className="mt-3 text-base leading-7 text-zinc-300">{item.text}</p>
                  </article>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
