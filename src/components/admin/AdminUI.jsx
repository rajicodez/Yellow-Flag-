import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function DemoLabel({ children = 'Demo Data' }) {
  return (
    <span className="inline-flex items-center rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-300">
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    Open: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    Active: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    Scored: 'border-blue-400/25 bg-blue-400/10 text-blue-300',
    Published: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    Closed: 'border-red-400/25 bg-red-400/10 text-red-300',
    Draft: 'border-zinc-400/25 bg-zinc-400/10 text-zinc-300',
    Pending: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${styles[status] ?? styles.Draft}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }) {
  const styles = {
    super_admin: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
    admin: 'border-red-400/30 bg-red-400/10 text-red-300',
    host: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
    user: 'border-white/15 bg-white/5 text-zinc-300',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${styles[role]}`}>
      {role}
    </span>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#111113]/90 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${className}`}>
      {children}
    </section>
  );
}

export function ScreenHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-400">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block text-sm font-bold text-zinc-200">
      <span className="mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

export const inputClass = 'w-full rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/15';

export function Modal({ open, title, description, children, onClose, size = 'md' }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]'
        ) ?? []
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`my-auto max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl border border-yellow-400/20 bg-[#121214] shadow-[0_24px_90px_rgba(0,0,0,0.7)] ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#121214]/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h3 id={titleId} className="font-display text-xl font-black uppercase text-white">{title}</h3>
            {description && <p id={descriptionId} className="mt-1 text-sm text-zinc-400">{description}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyNotice({ children }) {
  return <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center text-sm text-zinc-400">{children}</div>;
}
