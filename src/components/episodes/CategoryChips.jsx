import { episodeCategories } from '../../data/episodes';

const chips = [{ id: 'all', label: 'All Episodes', color: '#FFD400' }, ...episodeCategories];

export default function CategoryChips({ active, onChange }) {
  return (
    <div className="mb-10 flex flex-wrap justify-center gap-3" role="tablist" aria-label="Episode categories">
      {chips.map((chip) => {
        const isActive = active === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.id)}
            className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] transition duration-150 ${
              isActive
                ? 'border-flag/60 bg-flag/10 text-chequer'
                : 'border-white/10 bg-panel-2 text-steel hover:border-white/25 hover:text-zinc-200'
            }`}
          >
            <span
              className="h-3 w-3 rounded-full border-[3px]"
              style={{ borderColor: chip.color, opacity: isActive ? 1 : 0.55 }}
              aria-hidden="true"
            />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
