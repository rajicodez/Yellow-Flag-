import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

function DriverAvatar({ option }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (option.imageUrl && !imageFailed) {
    return (
      <img
        src={option.imageUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-9 w-9 shrink-0 rounded-lg bg-black/40 object-cover object-top ring-1 ring-white/10"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-black/40 font-display text-[10px] font-black text-white"
      style={{ borderColor: `${option.color}66` }}
    >
      {option.initials}
    </span>
  );
}

function ConstructorLogo({ option }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (option.logoUrl && !imageFailed) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 p-1.5">
        <img
          src={option.logoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`h-full w-full object-contain ${option.invertLogo ? 'invert brightness-200' : ''}`}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-black/40 font-display text-[9px] font-black text-white"
      style={{ borderColor: `${option.color}66` }}
    >
      {option.initials}
    </span>
  );
}

function OptionVisual({ option, type }) {
  return type === 'Driver'
    ? <DriverAvatar option={option} />
    : <ConstructorLogo option={option} />;
}

export default function SearchableAnswerSelect({
  disabled = false,
  invalid = false,
  label,
  onChange,
  options,
  type,
  value,
}) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const selectedOption = options.find((option) => option.answerId === value) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(
    () => normalizedQuery
      ? options.filter((option) => option.searchText.includes(normalizedQuery))
      : options,
    [normalizedQuery, options]
  );

  useEffect(() => {
    if (!open) return undefined;

    searchRef.current?.focus();
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!open || !filteredOptions[highlightedIndex]) return;
    document
      .getElementById(`${listboxId}-option-${highlightedIndex}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [filteredOptions, highlightedIndex, listboxId, open]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) window.requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const selectOption = (option) => {
    onChange(option.answerId);
    close(true);
  };

  const openSelect = () => {
    if (disabled) return;
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      setOpenAbove(spaceBelow < 360 && buttonRect.top > spaceBelow);
    }
    setOpen(true);
    setQuery('');
    setHighlightedIndex(Math.max(0, options.findIndex((option) => option.answerId === value)));
  };

  const handleButtonKeyDown = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openSelect();
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((current) => Math.max(current - 1, 0));
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      if (filteredOptions.length > 0) setHighlightedIndex(filteredOptions.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredOptions[highlightedIndex]) selectOption(filteredOptions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close();
    }
  };

  const noMatchesText = type === 'Driver'
    ? 'No matching driver found'
    : 'No matching constructor found';

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? 'z-50' : 'z-0'}`}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => open ? close() : openSelect()}
        onKeyDown={handleButtonKeyDown}
        className={`flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-black/35 px-3.5 py-2.5 text-left text-sm outline-none transition focus:ring-2 focus:ring-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          invalid
            ? 'border-red-400/70 ring-2 ring-red-400/10'
            : open
              ? 'border-yellow-400/60'
              : 'border-white/10 hover:border-yellow-400/35'
        }`}
      >
        {selectedOption && <OptionVisual option={selectedOption} type={type} />}
        <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'font-semibold text-white' : 'text-zinc-500'}`}>
          {selectedOption?.name ?? (disabled ? 'Inactive question' : 'Select the correct answer')}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-180 text-yellow-300' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 z-[70] min-w-0 rounded-xl border border-yellow-400/25 bg-[#18181b] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.75)] ${openAbove ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'}`}>
          <label className="relative block">
            <span className="sr-only">Search {type === 'Driver' ? 'drivers' : 'constructors'}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={`Search ${type === 'Driver' ? 'drivers' : 'constructors'}…`}
              aria-controls={listboxId}
              aria-activedescendant={filteredOptions[highlightedIndex] ? `${listboxId}-option-${highlightedIndex}` : undefined}
              className="w-full rounded-lg border border-white/10 bg-black/45 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
            />
          </label>

          <div id={listboxId} role="listbox" aria-label={`${type} answers`} className="mt-2 max-h-[min(18rem,48vh)] overflow-y-auto overscroll-contain rounded-lg">
            {filteredOptions.length > 0 ? filteredOptions.map((option, index) => {
              const selected = option.answerId === value;
              const highlighted = highlightedIndex === index;
              return (
                <button
                  id={`${listboxId}-option-${index}`}
                  key={option.answerId}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${highlighted ? 'bg-yellow-400/10' : 'hover:bg-white/5'}`}
                >
                  <OptionVisual option={option} type={type} />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden="true" />
                      <span className="truncate text-sm font-bold text-white">
                        {type === 'Driver' ? `#${option.number} ${option.name}` : option.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate pl-4 text-[11px] text-zinc-500">
                      {type === 'Driver' ? option.teamName : option.fullName}
                    </span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-yellow-300" aria-hidden="true" />}
                </button>
              );
            }) : (
              <p className="px-3 py-8 text-center text-sm text-zinc-500">{noMatchesText}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
