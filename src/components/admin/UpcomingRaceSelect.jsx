import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

const raceDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Colombo',
});

export default function UpcomingRaceSelect({ races, addedRaceIds, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const selectedRace = races.find((race) => race.id === value);

  const filteredRaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return races;

    return races.filter((race) => (
      `${race.name} ${race.grandPrix} ${race.country} ${race.circuit} ${race.round} round ${race.round}`
        .toLowerCase()
        .includes(query)
    ));
  }, [races, search]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    const focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.cancelAnimationFrame(focusFrame);
    };
  }, [open]);

  const firstAvailableIndex = (start, direction) => {
    if (!filteredRaces.length) return -1;
    let index = start;
    for (let count = 0; count < filteredRaces.length; count += 1) {
      index = (index + direction + filteredRaces.length) % filteredRaces.length;
      if (!addedRaceIds.has(filteredRaces[index].id)) return index;
    }
    return -1;
  };

  const chooseRace = (race) => {
    if (addedRaceIds.has(race.id)) return;
    onChange(race.id);
    setSearch('');
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedIndex((current) => firstAvailableIndex(current, direction));
      return;
    }

    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      chooseRace(filteredRaces[highlightedIndex]);
    }
  };

  const hasAvailableRace = races.some((race) => !addedRaceIds.has(race.id));

  return (
    <div ref={rootRef} className="relative sm:col-span-2">
      <label className="block text-sm font-bold text-zinc-200" htmlFor={`${listboxId}-trigger`}>
        <span className="mb-2 block">Select Upcoming Race <span className="text-yellow-400" aria-hidden="true">*</span></span>
      </label>
      <button
        id={`${listboxId}-trigger`}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        onClick={() => {
          setOpen((current) => !current);
          setHighlightedIndex(-1);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-black/35 px-3.5 py-3 text-left text-sm outline-none transition focus:ring-2 focus:ring-yellow-400/20 ${error ? 'border-red-400/70' : 'border-white/10 focus:border-yellow-400/60'}`}
      >
        <span className={selectedRace ? 'font-semibold text-white' : 'text-zinc-600'}>
          {selectedRace ? `Round ${selectedRace.round} — ${selectedRace.name}` : 'Choose the next Formula 1 race'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-300" role="alert">{error}</p>}

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-yellow-400/25 bg-[#18181b] shadow-[0_18px_55px_rgba(0,0,0,0.75)]">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/15"
                placeholder="Search Grand Prix, country, circuit or round"
                aria-label="Search upcoming races"
              />
            </div>
          </div>

          <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto p-1.5" aria-label="Upcoming Formula 1 races">
            {!hasAvailableRace ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-400">No upcoming races remain for the 2026 season.</li>
            ) : filteredRaces.length ? filteredRaces.map((race, index) => {
              const alreadyAdded = addedRaceIds.has(race.id);
              const selected = value === race.id;
              const highlighted = highlightedIndex === index;

              return (
                <li
                  key={race.id}
                  id={`${listboxId}-${race.id}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={alreadyAdded}
                  onMouseEnter={() => !alreadyAdded && setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseRace(race)}
                  className={`mb-1 flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-3 outline-none transition last:mb-0 ${
                    alreadyAdded
                      ? 'cursor-not-allowed border-transparent bg-white/[0.02] opacity-55'
                      : highlighted
                        ? 'border-yellow-400/35 bg-yellow-400/10'
                        : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white">Round {race.round} — {race.name} — {raceDateFormatter.format(new Date(race.raceStart))}</span>
                      {race.sprintWeekend && <span className="rounded-full border border-yellow-400/35 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-yellow-300">Sprint</span>}
                      {alreadyAdded && <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300">Already Added</span>}
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-400">{race.circuit} · {race.country}</p>
                  </div>
                  {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />}
                </li>
              );
            }) : (
              <li className="px-4 py-8 text-center text-sm text-zinc-400">No upcoming races match your search.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
