import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { act, errorText, logout } from '../store/actions';
import './DemoBar.css';

/** Kleiner Demo-Schalter in der Ecke: Rolle wechseln + Demo zurücksetzen. */
export function DemoBar() {
  const [open, setOpen] = useState(false);
  const session = useStore((s) => s.session);
  const login = useStore((s) => s.login);
  const reset = useStore((s) => s.resetDemo);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const mode = useStore((s) => s.mode);
  if (pathname.startsWith('/kind/spiel/')) return null;
  if (mode === 'klasse') {
    return (
      <div className="demobar">
        {open && <button type="button" className="demobar-backdrop" aria-label="Menü schliessen" tabIndex={-1} onClick={() => setOpen(false)} />}
        {open && (
          <div className="demobar-panel online" role="group" aria-label="Klasse 6c online">
            {session?.role === 'teacher' && (
              <button type="button" className="danger" onClick={async () => {
                if (!window.confirm('Alle Daten der Klasse 6c auf den Anfang zurücksetzen? Das betrifft alle Geräte.')) return;
                try { await act.resetClass(); setOpen(false); nav('/lehrerin'); } catch (e) { window.alert(errorText(e)); }
              }}>Klassendaten zurücksetzen</button>
            )}
            <button type="button" onClick={async () => { await logout(); useStore.getState().leaveClass(); setOpen(false); nav('/'); }}>
              Zur Demo wechseln
            </button>
          </div>
        )}
        <button type="button" className="demobar-toggle online" aria-expanded={open} aria-label="Klasse 6c online – Menü" onClick={() => setOpen(!open)}>
          <span aria-hidden="true">Online</span>
        </button>
      </div>
    );
  }
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
