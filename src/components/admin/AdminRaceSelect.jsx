import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { StatusBadge } from './AdminUI';
import { getRaceStableId } from './useAdminRaceWorkspace';

const raceDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Colombo',
});

function getRacePhase(race) {
  if (race.status === 'Open') return 'Active';
  if (race.status === 'Scored') return 'Scored';
  if (race.status === 'Closed') return 'Closed';
  return new Date(race.raceStart).getTime() >= Date.now() ? 'Upcoming' : 'Past';
}

export default function AdminRaceSelect({
  label = 'Select Race',
  onChange,
  placeholder = 'Choose a race to manage its questions',
  questionsByRaceId,
  races,
  value,
}) {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listboxId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);

  const sortedRaces = useMemo(
    () => [...races].sort((first, second) => new Date(first.raceStart) - new Date(second.raceStart)),
    [races]
  );
  const selectedRace = races.find((race) => getRaceStableId(race) === value) ?? null;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRaces = useMemo(() => normalizedSearch
    ? sortedRaces.filter((race) => (
      `${race.name} ${race.country} ${race.circuit} ${race.round} round ${race.round} ${race.status}`
        .toLowerCase()
        .includes(normalizedSearch)
    ))
    : sortedRaces, [normalizedSearch, sortedRaces]);

  useEffect(() => {
    if (!open) return undefined;
    const focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [normalizedSearch]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setSearch('');
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const openSelect = () => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (triggerRect) {
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      setOpenAbove(spaceBelow < 430 && triggerRect.top > spaceBelow);
    }
    setOpen(true);
    setHighlightedIndex(Math.max(0, filteredRaces.findIndex((race) => getRaceStableId(race) === value)));
  };

  const chooseRace = (race) => {
    onChange(getRaceStableId(race));
    close(true);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, filteredRaces.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlightedIndex(Math.max(0, filteredRaces.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredRaces[highlightedIndex]) chooseRace(filteredRaces[highlightedIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close();
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? 'z-[60]' : 'z-0'}`}>
      <label htmlFor={`${listboxId}-trigger`} className="mb-2 block text-sm font-bold text-zinc-200">{label}</label>
      <button
        ref={triggerRef}
        id={`${listboxId}-trigger`}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => open ? close() : openSelect()}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            if (!open) openSelect();
          }
        }}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-left outline-none transition hover:border-yellow-400/35 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20"
      >
        <span className="min-w-0">
          <span className={`block truncate text-sm ${selectedRace ? 'font-black text-white' : 'text-zinc-600'}`}>
            {selectedRace ? `Round ${selectedRace.round} — ${selectedRace.name}` : placeholder}
          </span>
          {selectedRace && <span className="mt-1 block truncate text-xs text-zinc-500">{selectedRace.circuit} · {raceDateFormatter.format(new Date(selectedRace.raceStart))}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? 'rotate-180 text-yellow-300' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 z-[70] overflow-hidden rounded-xl border border-yellow-400/25 bg-[#18181b] shadow-[0_22px_65px_rgba(0,0,0,0.78)] ${openAbove ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'}`}>
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                aria-controls={listboxId}
                aria-activedescendant={filteredRaces[highlightedIndex] ? `${listboxId}-option-${highlightedIndex}` : undefined}
                aria-label="Search races"
                placeholder="Search race, country, circuit or round"
                className="w-full rounded-lg border border-white/10 bg-black/45 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
              />
            </div>
          </div>

          <div id={listboxId} role="listbox" aria-label="Admin races" className="max-h-[min(23rem,52vh)] overflow-y-auto overscroll-contain p-1.5">
            {filteredRaces.length ? filteredRaces.map((race, index) => {
              const raceId = getRaceStableId(race);
              const selected = raceId === value;
              const highlighted = index === highlightedIndex;
              const configuredQuestions = questionsByRaceId[raceId];
              const questionStatus = configuredQuestions?.length
                ? `${configuredQuestions.length} Questions Configured`
                : 'Questions Not Configured';

              return (
                <button
                  id={`${listboxId}-option-${index}`}
                  key={raceId}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => chooseRace(race)}
                  className={`mb-1 flex w-full min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-left outline-none transition last:mb-0 ${highlighted ? 'border-yellow-400/30 bg-yellow-400/10' : 'border-transparent hover:bg-white/5'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-white">Round {race.round} — {race.name}</span>
                      {race.sprintWeekend && <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300">Sprint</span>}
                      <StatusBadge status={race.status} />
                    </span>
                    <span className="mt-1 block truncate text-xs text-zinc-400">{race.circuit} · {raceDateFormatter.format(new Date(race.raceStart))}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
                      <span className="text-yellow-300">{getRacePhase(race)}</span>
                      <span className="text-zinc-600" aria-hidden="true">•</span>
                      <span className={configuredQuestions?.length ? 'text-zinc-300' : 'text-amber-300'}>{questionStatus}</span>
                    </span>
                  </span>
                  {selected && <Check className="mt-1 h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />}
                </button>
              );
            }) : (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">No races match your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
