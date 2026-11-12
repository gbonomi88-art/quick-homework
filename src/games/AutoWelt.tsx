import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { act } from '../store/actions';
import { DEFAULT_GARAGE } from '../store/rules';
import type { Garage } from '../store/types';
import { advance, carSpec, distance, newCar, points, type CarState } from './hill/engine';
import { draw, updateCamera, updateParticles, type Particle, type View } from './hill/render';
import { SHAPES } from './hill/cars';
import { GameFrame } from './GameFrame';
import './hill/hill.css';

/** Auto-Welt: Gelände-Fahrspiel. Gas/Bremse, über Hügel fahren und springen – nicht umkippen! */
export function AutoWelt() {
  const kid = useStore((s) => (s.session?.role === 'kid' ? s.session.studentId : ''));
  const garage = useStore((s) => s.data.garages[kid]) ?? DEFAULT_GARAGE;
  const best = garage.best ?? 0;
  return (
    <GameFrame game="auto" label="Auto-Welt" warnHint="fahr noch ein paar Meter!"
      overText="Gut gefahren! Dein Rekord und dein Auto sind gespeichert. Nach der nächsten Hausaufgabe darfst du wieder fahren."
      score={<>Rekord: {best} m</>}
      extra={
        <Link to="/kind/shop" className="gf-pill accent" aria-label="Garage & Shop">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6v10H3z" /><path d="M7 20v-6h10v6" /></svg>
          <span className="pill-text">Garage &amp; Shop</span>
        </Link>
      }>
      {({ over, studentId }) => <Race over={over} studentId={studentId} garage={{ ...DEFAULT_GARAGE, ...garage }} />}
    </GameFrame>
  );
}

type Phase = 'ready' | 'drive' | 'crash';

function Race({ over, studentId, garage }: { over: boolean; studentId: string; garage: Garage }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const spec = useRef(carSpec(garage));
  const car = useRef<CarState>(newCar(spec.current));
  const input = useRef({ gas: false, brake: false });
  const particles = useRef<Particle[]>([]);
  const view = useRef<View>({ camX: 5, camY: 1, ppm: 50, W: 800, H: 600 });
  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const [hud, setHud] = useState({ m: 0, p: 0, stars: 0 });
  const [event, setEvent] = useState<{ text: string; id: number } | null>(null);
  const [result, setResult] = useState<{ m: number; p: number; record: boolean } | null>(null);
  const [gas, setGas] = useState(false);
  const [brake, setBrake] = useState(false);
  const best = garage.best ?? 0;
  const bestRef = useRef(best);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overRef = useRef(over);
  overRef.current = over;

  const setPh = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const press = (k: 'gas' | 'brake', on: boolean) => {
    input.current[k] = on;
    if (k === 'gas') setGas(on); else setBrake(on);
    if (on && phaseRef.current === 'ready') setPh('drive');
  };
  const restart = () => {
    spec.current = carSpec(garage);
    car.current = newCar(spec.current);
    particles.current = [];
    view.current.camX = 5; view.current.camY = 1;
    input.current = { gas: false, brake: false }; setGas(false); setBrake(false);
    setResult(null); setHud({ m: 0, p: 0, stars: 0 }); setPh('ready');
  };

  // Spiel-Schleife
  useEffect(() => {
    let raf = 0, last = performance.now(), lastEvt = 0, hudT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const c = canvas.current; const ctx = c?.getContext('2d');
      if (c && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = c.clientWidth, H = c.clientHeight;
        if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const v = view.current; v.W = W; v.H = H;
        const s = car.current;
        if (phaseRef.current === 'drive' && !overRef.current) {
          advance(s, spec.current, input.current, dt);
          if (s.events.length && s.events[s.events.length - 1].t !== lastEvt) {
            const e = s.events[s.events.length - 1]; lastEvt = e.t; setEvent({ text: e.text, id: e.t });
          }
          if (s.crashed) {
            const m = distance(s), p = points(s), record = m > bestRef.current;
            if (record) { bestRef.current = m; act.saveBest(studentId, m); }
            setResult({ m, p, record });
            input.current = { gas: false, brake: false }; setGas(false); setBrake(false);
            setPh('crash');
          }
        } else if (phaseRef.current === 'crash') advance(s, spec.current, { gas: false, brake: false }, dt);
        updateParticles(particles.current, s, spec.current, input.current.gas, dt, reduced);
        updateCamera(v, s, dt);
        draw(ctx, v, s, spec.current, garage, input.current, particles.current, now / 1000, bestRef.current, reduced);
        hudT += dt;
        if (hudT > 0.15) { hudT = 0; setHud({ m: distance(s), p: points(s), stars: s.stars }); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tastatur: Pfeile oder A/D, Leertaste = Gas
  useEffect(() => {
    const map = (e: KeyboardEvent): 'gas' | 'brake' | null =>
      ['ArrowRight', 'd', 'D', 'ArrowUp', ' '].includes(e.key) ? 'gas' : ['ArrowLeft', 'a', 'A', 'ArrowDown'].includes(e.key) ? 'brake' : null;
    const down = (e: KeyboardEvent) => { const k = map(e); if (!k || (e.target as HTMLElement)?.tagName === 'BUTTON' && e.key === ' ') return; e.preventDefault(); if (phaseRef.current !== 'crash') press(k, true); };
    const up = (e: KeyboardEvent) => { const k = map(e); if (k) press(k, false); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!event) return; const t = setTimeout(() => setEvent(null), 1400); return () => clearTimeout(t); }, [event]);

  const pedal = (k: 'gas' | 'brake') => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); press(k, true); },
    onPointerUp: () => press(k, false), onPointerCancel: () => press(k, false), onLostPointerCapture: () => press(k, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') press(k, true); },
    onKeyUp: (e: React.KeyboardEvent) => { if (e.key === 'Enter') press(k, false); },
  });

  return (
    <div className="hr">
      <canvas ref={canvas} className="hr-canvas" role="img"
        aria-label={`Gelände-Fahrspiel mit dem ${SHAPES[garage.activeCar]?.name ?? 'Auto'}. ${hud.m} Meter gefahren.`} />
      <div className="hr-hud" aria-hidden={phase === 'crash'}>
        <div className="hr-stat"><b>{hud.m}</b> m</div>
        <div className="hr-stat"><b>{hud.p}</b> Punkte</div>
        <div className="hr-stat"><span aria-hidden="true">★</span> <b>{hud.stars}</b></div>
      </div>
      <div className="hr-event-wrap" aria-live="polite">{event && <div key={event.id} className="hr-event">{event.text}</div>}</div>
      {phase === 'ready' && !over && (
        <div className="hr-ready" role="status">
          <b>Bereit?</b> Halte <b>Gas</b> gedrückt und fahr los. In der Luft kippst du mit Gas nach hinten und mit Bremse nach vorne.
          Pass auf, dass du nicht auf dem Dach landest!
        </div>
      )}
      {phase !== 'crash' && (
        <div className="hr-pedals">
          <button type="button" className={`hr-pedal brake${brake ? ' on' : ''}`} aria-pressed={brake} aria-label="Bremse (Pfeil links)" {...pedal('brake')} disabled={over}>
            <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            Bremse
          </button>
          <button type="button" className={`hr-pedal gas${gas ? ' on' : ''}`} aria-pressed={gas} aria-label="Gas (Pfeil rechts)" {...pedal('gas')} disabled={over}>
            Gas
            <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
      {phase === 'crash' && result && !over && (
        <div className="hr-crash">
          <div role="alertdialog" aria-modal="true" aria-labelledby="hr-crash-title" className="hr-crash-box">
            <div id="hr-crash-title" className="hr-crash-title">Umgekippt!</div>
            {result.record && <div className="hr-record">Neuer Rekord!</div>}
            <div className="hr-crash-stats">
              <div><b>{result.m} m</b><span>gefahren</span></div>
              <div><b>{result.p}</b><span>Punkte</span></div>
              <div><b>{Math.max(best, result.m)} m</b><span>Rekord</span></div>
            </div>
            <div className="hr-tip">Tipp: Lass vor dem Landen kurz los oder tipp auf Bremse, damit das Auto gerade landet.</div>
            <div className="hr-crash-actions">
              <Link to="/kind/shop" className="hr-btn soft">Garage &amp; Shop</Link>
              <button type="button" className="hr-btn" autoFocus onClick={restart}>Nochmal fahren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
