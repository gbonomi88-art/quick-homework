import { useEffect, useRef, useState } from 'react';
import { GameFrame } from './GameFrame';
import { advance, heightM, newJump, score, type JumpState } from './jump/engine';
import { drawHero, drawJump, layout, updateCam, type JView } from './jump/render';
import { loadJump, MISSIONS, SKINS, UPGRADES, type JumpProgress } from './jump/meta';
import { settle, type Mission } from './missions';
import { MissionList, Pips, RoundOver, Sheet, ShopRow, StarIcon, useProgress } from './kit';
import './hill/hill.css';
import './jump/jump.css';

/** Hüpf-Held: endlos nach oben springen, Sterne sammeln, Figuren und Verbesserungen kaufen. */
export function HuepfHeld() {
  const [prog, save] = useProgress('huepf', loadJump);
  const [sheet, setSheet] = useState(false);
  return (
    <GameFrame game="huepf" label="Hüpf-Held" warnHint="spring noch einmal richtig hoch!"
      overText={`Dein Rekord: ${prog.best} m. Sterne und Figuren sind gespeichert. Nach der nächsten Hausaufgabe geht es weiter.`}
      score={<><StarIcon /> {prog.wallet} · Rekord {prog.best} m</>}
      extra={
        <button type="button" className="gf-pill accent" onClick={() => setSheet(true)} aria-label="Shop und Aufträge">
          <StarIcon size={20} /><span className="pill-text">Shop &amp; Aufträge</span>
        </button>
      }>
      {({ over }) => <Jump over={over} prog={prog} save={save} sheet={sheet} setSheet={setSheet} />}
    </GameFrame>
  );
}

type Phase = 'ready' | 'play' | 'dead';

function Jump({ over, prog, save, sheet, setSheet }: { over: boolean; prog: JumpProgress; save: (p: JumpProgress, flush?: boolean) => void; sheet: boolean; setSheet: (b: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const progRef = useRef(prog); progRef.current = prog;
  const s = useRef<JumpState>(newJump(prog.up));
  const view = useRef<JView>({ W: 800, H: 600, ppm: 60, x0: 0, camY: -1.5 });
  const dirs = useRef(new Map<number, number>());
  const keys = useRef({ l: false, r: false });
  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const pausedRef = useRef(false); pausedRef.current = sheet || over;
  const [hud, setHud] = useState({ m: 0, p: 0, st: 0 });
  const [event, setEvent] = useState<{ text: string; id: number } | null>(null);
  const [result, setResult] = useState<{ m: number; p: number; st: number; record: boolean; finished: Mission[] } | null>(null);
  const [side, setSide] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setPh = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const dir = () => {
    let d = (keys.current.r ? 1 : 0) - (keys.current.l ? 1 : 0);
    if (!d) for (const v of dirs.current.values()) d = v;
    return d;
  };

  const finish = () => {
    const st = s.current, p = progRef.current;
    const m = heightM(st), pts = score(st);
    const round = { height: m, stars: st.stars, stomps: st.stomps, rockets: st.rockets, points: pts, rounds: 1 };
    const { state, finished } = settle(MISSIONS, p.missions, round);
    const bonus = finished.reduce((a, x) => a + x.reward, 0);
    save({ ...p, best: Math.max(p.best, m), bestPoints: Math.max(p.bestPoints, pts), wallet: p.wallet + st.stars + bonus, missions: state }, true);
    setResult({ m, p: pts, st: st.stars, record: m > p.best, finished });
    setPh('dead');
  };

  const restart = () => {
    s.current = newJump(progRef.current.up);
    view.current.camY = -1.5;
    setResult(null); setHud({ m: 0, p: 0, st: 0 }); setPh('ready');
  };

  useEffect(() => {
    let raf = 0, last = performance.now(), hudT = 0, lastEvt = -1;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const c = canvas.current, ctx = c?.getContext('2d');
      if (c && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = c.clientWidth, H = c.clientHeight;
        if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const v = view.current; v.W = W; v.H = H; layout(v);
        const st = s.current, d = dir();
        if (phaseRef.current === 'play' && !pausedRef.current) {
          advance(st, d, dt, progRef.current.up, v.camY);
          const e = st.events[st.events.length - 1];
          if (e && e.t !== lastEvt) { lastEvt = e.t; setEvent({ text: e.text, id: e.t }); }
          if (st.dead) finish();
        }
        updateCam(v, st);
        const skin = SKINS.find((k) => k.id === progRef.current.skin) ?? SKINS[0];
        drawJump(ctx, v, st, skin, phaseRef.current === 'play' ? d : 0, now / 1000, progRef.current.best, reduced);
        hudT += dt;
        if (hudT > 0.12) { hudT = 0; setHud({ m: heightM(st), p: score(st), st: st.stars }); setSide(d); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      const l = ['ArrowLeft', 'a', 'A'].includes(e.key), r = ['ArrowRight', 'd', 'D'].includes(e.key);
      if (!l && !r) return;
      e.preventDefault();
      if (l) keys.current.l = on; if (r) keys.current.r = on;
      if (on && phaseRef.current === 'ready' && !pausedRef.current) setPh('play');
    };
    const down = (e: KeyboardEvent) => set(e, true), up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => { if (!event) return; const t = setTimeout(() => setEvent(null), 1100); return () => clearTimeout(t); }, [event]);

  const touch = {
    onPointerDown: (e: React.PointerEvent) => {
      if (pausedRef.current || phaseRef.current === 'dead') return;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dirs.current.set(e.pointerId, e.clientX - r.left < r.width / 2 ? -1 : 1);
      if (phaseRef.current === 'ready') setPh('play');
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dirs.current.has(e.pointerId)) return;
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dirs.current.set(e.pointerId, e.clientX - r.left < r.width / 2 ? -1 : 1);
    },
    onPointerUp: (e: React.PointerEvent) => dirs.current.delete(e.pointerId),
    onPointerCancel: (e: React.PointerEvent) => dirs.current.delete(e.pointerId),
  };

  const buySkin = (id: string, price: number) => {
    const p = progRef.current;
    if (p.skins.includes(id)) return save({ ...p, skin: id });
    if (p.wallet < price) return;
    save({ ...p, wallet: p.wallet - price, skins: [...p.skins, id], skin: id }, true);
  };
  const buyUp = (id: keyof JumpProgress['up'], price: number) => {
    const p = progRef.current;
    if (p.wallet < price) return;
    save({ ...p, wallet: p.wallet - price, up: { ...p.up, [id]: p.up[id] + 1 } }, true);
    if (phaseRef.current === 'ready') s.current = newJump({ ...p.up, [id]: p.up[id] + 1 });
  };
  useEffect(() => { if (!sheet && phaseRef.current === 'ready') s.current = newJump(progRef.current.up); }, [sheet]);

  return (
    <div className="jp" {...touch}>
      <canvas ref={canvas} className="jp-canvas" role="img" aria-label={`Hüpf-Held, ${hud.m} Meter hoch. Links oder rechts auf den Bildschirm tippen, um zu steuern.`} />
      <div className="hr-hud jp-hud" aria-hidden={phase === 'dead'}>
        <div className="hr-stat"><b>{hud.m}</b> m</div>
        <div className="hr-stat"><b>{hud.p}</b> Punkte</div>
        <div className="hr-stat"><span aria-hidden="true">★</span> <b>{hud.st}</b></div>
      </div>
      <div className="hr-event-wrap" aria-live="polite">{event && <div key={event.id} className="hr-event">{event.text}</div>}</div>
      {phase !== 'dead' && (
        <div className="jp-zones" aria-hidden="true">
          <div className={side < 0 ? 'on' : ''}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg></div>
          <div className={side > 0 ? 'on' : ''}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></div>
        </div>
      )}
      {phase === 'ready' && !over && !sheet && (
        <div className="hr-ready" role="status">
          <b>Bereit?</b> Tippe links oder rechts auf den Bildschirm (oder Pfeiltasten), um zu steuern. Der Held springt von selbst.
          Sammle Sterne, spring Gegnern auf den Kopf – und fall nicht runter!
          <div className="jp-ready-m"><MissionList list={MISSIONS} state={prog.missions} unit={<StarIcon size={14} />} /></div>
        </div>
      )}
      {phase === 'dead' && result && !over && !sheet && (
        <RoundOver title={s.current.events.at(-1)?.text ?? 'Vorbei!'} record={result.record ? 'Neuer Rekord!' : undefined}
          stats={[[`${result.m} m`, 'Höhe'], [result.p, 'Punkte'], [<><StarIcon size={18} /> {result.st}</>, 'Sterne'], [`${Math.max(prog.best, result.m)} m`, 'Rekord']]}
          finished={result.finished} unit={<StarIcon size={14} />}>
          <button type="button" className="kit-btn soft" onClick={() => setSheet(true)}>Shop &amp; Aufträge</button>
          <button type="button" className="kit-btn" autoFocus onClick={restart}>Nochmal springen</button>
        </RoundOver>
      )}
      {sheet && (
        <Sheet title="Shop & Aufträge" wallet={<><StarIcon /> {prog.wallet}</>} onClose={() => setSheet(false)}>
          <h3>Aufträge</h3>
          <MissionList list={MISSIONS} state={prog.missions} unit={<StarIcon size={14} />} />
          <h3>Verbesserungen</h3>
          {UPGRADES.map((u) => {
            const lv = prog.up[u.id], max = u.prices.length, price = u.prices[lv];
            return <ShopRow key={u.id} name={u.name} desc={u.desc} preview={<Pips n={lv} max={max} />} state={lv >= max ? 'max' : 'buy'} price={price}
              unit={<StarIcon size={14} />} canPay={prog.wallet >= (price ?? Infinity)} onClick={() => buyUp(u.id, price)} />;
          })}
          <h3>Figuren</h3>
          {SKINS.map((k) => (
            <ShopRow key={k.id} name={k.name} preview={<HeroPreview id={k.id} />}
              state={prog.skin === k.id ? 'active' : prog.skins.includes(k.id) ? 'use' : 'buy'} price={k.price}
              unit={<StarIcon size={14} />} canPay={prog.wallet >= k.price} onClick={() => buySkin(k.id, k.price)} />
          ))}
        </Sheet>
      )}
    </div>
  );
}

function HeroPreview({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext('2d'); if (!c || !ctx) return;
    c.width = 112; c.height = 112; ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 56, 56);
    ctx.translate(28, 50);
    drawHero(ctx, 52, { vy: 0, squash: 0, face: 1, rocket: 0, shield: false }, SKINS.find((k) => k.id === id)!, 0, 0);
  }, [id]);
  return <canvas ref={ref} style={{ width: 56, height: 56 }} aria-hidden="true" />;
}
