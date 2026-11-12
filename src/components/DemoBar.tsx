import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './DemoBar.css';

/** Kleiner Demo-Schalter in der Ecke: Rolle wechseln + Demo zurücksetzen. */
export function DemoBar() {
  const [open, setOpen] = useState(false);
  const session = useStore((s) => s.session);
  const login = useStore((s) => s.login);
  const reset = useStore((s) => s.resetDemo);
  const nav = useNavigate();
  const { pathname } = useLocation();
  if (pathname.startsWith('/kind/spiel/')) return null;
  return (
    <div className="demobar">
      {open && <button type="button" className="demobar-backdrop" aria-label="Demo-Menü schliessen" tabIndex={-1} onClick={() => setOpen(false)} />}
      {open && (
        <div className="demobar-panel" role="group" aria-label="Demo-Steuerung">
          <button type="button" aria-pressed={session?.role === 'kid'} onClick={() => { login({ role: 'kid', studentId: 'mattia' }, false); nav('/kind'); setOpen(false); }}>
            Als Mattia (Kind)
          </button>
          <button type="button" aria-pressed={session?.role === 'teacher'} onClick={() => { login({ role: 'teacher' }, false); nav('/lehrerin'); setOpen(false); }}>
            Als Lehrerin
          </button>
          <button type="button" className="danger" onClick={() => {
            if (window.confirm('Alle Demo-Daten auf den Anfang zurücksetzen?')) { reset(); nav('/'); setOpen(false); }
          }}>
            Demo zurücksetzen
          </button>
        </div>
      )}
      <button type="button" className="demobar-toggle" aria-expanded={open} aria-label="Demo: Rolle wechseln" onClick={() => setOpen(!open)}>
        <span aria-hidden="true">Demo</span>
      </button>
    </div>
  );
}
