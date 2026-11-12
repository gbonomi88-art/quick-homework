import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './DemoBar.css';

/** Kleiner Demo-Schalter in der Ecke: Rolle wechseln + Demo zurücksetzen. */
export function DemoBar() {
  const [open, setOpen] = useState(false);
  const session = useStore((s) => s.session);
  const login = useStore((s) => s.login);
  const reset = useStore((s) => s.resetDemo);
  const nav = useNavigate();
  return (
    <div className="demobar">
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
      <button type="button" className="demobar-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        Demo: Rolle wechseln
      </button>
    </div>
  );
}
