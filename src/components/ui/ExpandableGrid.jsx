import { useState } from 'react';
import { motion } from 'framer-motion';

const oliveButtonClass =
  'inline-flex items-center justify-center rounded-full border border-[#4A4638] bg-[linear-gradient(90deg,#2A2820_0%,#2C2A21_45%,#302E26_100%)] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[#5C5748] hover:bg-[linear-gradient(90deg,#323028_0%,#353228_50%,#3A372E_100%)]';

export default function ExpandableGrid({
  children,
  expandLabel = 'See More',
  collapseLabel = 'See Less',
  collapsedMaxHeight = 'max-h-[640px]',
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <div
        className={`relative overflow-hidden transition-[max-height] duration-700 ease-in-out ${
          isExpanded ? 'max-h-[12000px]' : collapsedMaxHeight
        }`}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{children}</div>

        {!isExpanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="relative z-10 mt-8 flex justify-center">
        <motion.button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={oliveButtonClass}
          aria-expanded={isExpanded}
        >
          {isExpanded ? collapseLabel : expandLabel}
        </motion.button>
      </div>
    </div>
  );
}
