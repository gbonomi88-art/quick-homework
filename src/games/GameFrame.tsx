import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { act } from '../store/actions';
import { timeLeftMs, timerPhase } from '../store/rules';
import type { GameId } from '../store/types';
import './GameFrame.css';

const PHASE_COLOR = { gruen: '#2F7D4F', orange: '#C9741A', rot: '#C8372D', aus: '#C8372D' };

export interface GameProps { over: boolean; studentId: string }

interface Props {
  game: GameId;
  label: string;
  score: ReactNode;
  extra?: ReactNode;
  warnHint: string;
  overText: string;
  light?: boolean;
  children: (p: GameProps) => ReactNode;
}

/** Gleicher Rahmen für alle Spiele: Header mit „Spiel beenden“, Timer, Spielstand. */
export function GameFrame({ game, label, score, extra, warnHint, overText, light, children }: Props) {
  const session = useStore((s) => s.data.gameSession);
  const maxMinutes = useStore((s) => s.data.settings.maxMinutes);
  const kid = useStore((s) => (s.session?.role === 'kid' ? s.session.studentId : ''));
  const nav = useNavigate();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  const active = session && session.game === game && kid && useStore.getState().data.submissions.find((s) => s.id === session.submissionId)?.studentId === kid;
  if (!active) {
    return (
      <main className="gf-none">
        <h1>Kein Spiel gestartet</h1>
        <p>Spielen darfst du nach einer abgegebenen Hausaufgabe – wähle dein Spiel auf der Belohnungs-Seite.</p>
        <Link to="/kind" className="gf-btn">Zur Übersicht</Link>
      </main>
    );
  }
  const total = maxMinutes * 60_000;
  const left = timeLeftMs(session, maxMinutes, now);
  const phase = timerPhase(left);
  const over = phase === 'aus';
  const secs = Math.ceil(left / 1000);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const warn = phase === 'orange' || phase === 'rot';
  const warnText = phase === 'rot' ? 'weniger als 1 Minute' : `${Math.ceil(left / 60_000)} Minuten`;

  const end = () => { act.endGame(); nav('/kind'); };
  const skip = () => {
    const target = left > 300_000 ? 300_000 : left > 60_000 ? 60_000 : left > 5_000 ? 5_000 : 0;
    act.skipTime(left - target);
    setNow(Date.now());
  };

  return (
    <main className={`gf gf-${game}${light ? ' light' : ''}`} aria-label={label}>
      <div className="gf-hud">
        <div className="gf-left">
          <button type="button" className="gf-pill" onClick={end}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            Spiel beenden
          </button>
          {extra}
        </div>
        <div role="timer" aria-label={`Spielzeit: noch ${clock}`} className="gf-timer" style={{ background: PHASE_COLOR[phase] }}>
          <div className="gf-timer-label">SPIELZEIT</div>
          <div className="gf-clock">{clock}</div>
          <div className="gf-timer-bar"><div style={{ width: `${(left / total) * 100}%` }} /></div>
        </div>
        <div className="gf-pill gf-score" aria-live="polite">{score}</div>
      </div>
      <div aria-live="polite" className="gf-warn-wrap">{warn && !over && <div className="gf-warn" role="status">Noch {warnText} – {warnHint}</div>}</div>
      <div className="gf-body" aria-hidden={over || undefined} style={over ? { pointerEvents: 'none' } : undefined}>{children({ over, studentId: kid })}</div>
      {!over && <button type="button" className="gf-skip" onClick={skip}>Nur zum Testen: Zeit vorspulen</button>}
      {over && (
        <div className="gf-over">
          <div role="alertdialog" aria-modal="true" aria-labelledby="gf-over-title" className="gf-over-box">
            <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4A2424" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5" /><path d="M9 2h6" /></svg>
            <div id="gf-over-title" className="gf-over-title">Die Zeit ist um!</div>
            <div className="gf-over-text">{overText}</div>
            <button type="button" className="gf-btn" autoFocus onClick={end}>Zurück zur Übersicht</button>
          </div>
        </div>
      )}
    </main>
  );
}

/** Bühne im Design-Mass 1100×720, skaliert auf die verfügbare Fläche. */
export function Stage({ children, label }: { children: ReactNode; label?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = outer.current!;
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / 1100, el.clientHeight / 720)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="stage-outer" ref={outer} role={label ? 'img' : undefined} aria-label={label}>
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${k})` }}>{children}</div>
    </div>
  );
}
