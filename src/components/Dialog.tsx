import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Popover/Modal: hält den Fokus, Esc und Klick daneben schliessen. */
export function Dialog({ label, onClose, className, children, backdropLabel = 'Fenster schliessen' }:
  { label: string; onClose: () => void; className?: string; children: ReactNode; backdropLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <button type="button" className="dialog-backdrop" aria-label={backdropLabel} tabIndex={-1} onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={`dialog ${className ?? ''}`}>{children}</div>
    </>
  );
}

export function CloseButton({ onClick, label = 'Schliessen' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="dialog-close" aria-label={label} onClick={onClick}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}
