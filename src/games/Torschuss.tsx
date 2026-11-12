import { useEffect, useRef, useState } from 'react';
import { GameFrame } from './GameFrame';
import { advance, GOAL_H, GOAL_W, kick, newKick, setupRound, shotAt, shotFromSwipe, type KickState } from './kick/engine';
import { drawKick, layoutKick, unprojectGoal, type KView } from './kick/render';
import { BALLS, KICK_MISSIONS, KICK_UPGRADES, loadKick, type KickProgress } from './kick/meta';
import { settle, type Mission } from './missions';
import { MissionList, Pips, RoundOver, Sheet, ShopRow, useProgress } from './kit';
import './hill/hill.css';
import './jump/jump.css';

export const Coin = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#F2B33D" stroke="#C98A12" strokeWidth="1.5" /><circle cx="12" cy="12" r="6.5" fill="none" stroke="#C98A12" strokeWidth="1.2" /><path d="M12 8.5v7" stroke="#9A6400" strokeWidth="2" strokeLinecap="round" /></svg>
);

/** Torschuss: Elfmeter per Wischen, Torhüter wird besser, Mauer und Zielscheiben. */
export function Torschuss() {
  const [prog, save] = useProgress('tor', loadKick);
  const [sheet, setSheet] = useState(false);
  return (
    <GameFrame game="tor" label="Torschuss" warnHint="noch ein paar Schüsse!"
      overText={`Dein Rekord: ${prog.best} Punkte. Münzen und Bälle sind gespeichert. Nach der nächsten Hausaufgabe darfst du wieder schiessen.`}
      score={<><Coin /> {prog.wallet} · Rekord {prog.best}</>}
      extra={
        <button type="button" className="gf-pill accent" onClick={() => setSheet(true)} aria-label="Shop und Aufträge">
          <Coin size={20} /><span className="pill-text">Shop &amp; Aufträge</span>
        </button>
      }>
      {({ over }) => <Kick over={over} prog={prog} save={save} sheet={sheet} setSheet={setSheet} />}
    </GameFrame>
  );
}

type Phase = 'aim' | 'flight' | 'over';
interface Pt { x: number; y: number; t: number }

function Kick({ over, prog, save, sheet, setSheet }: { over: boolean; prog: KickProgress; save: (p: KickProgress, flush?: boolean) => void; sheet: boolean; setSheet: (b: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const progRef = useRef(prog); progRef.current = prog;
  const s = useRef<KickState>(newKick(prog.up));
  const view = useRef<KView>({ W: 800, H: 600, f: 1000, cx: 400, hz: 100, camZ: 16, camH: 1.8 });
  const swipe = useRef<Pt[] | null>(null);
  const trail = useRef<{ x: number; y: number; z: number }[]>([]);
  const aim = useRef<{ x: number; y: number } | null>(null);
  const cheer = useRef(0);
  const [phase, setPhase] = useState<Phase>('aim');
  const phaseRef = useRef<Phase>('aim');
  const pausedRef = useRef(false); pausedRef.current = sheet || over;
  const [hud, setHud] = useState({ p: 0, g: 0, lv: 1, lives: 3, streak: 0 });
  const [msg, setMsg] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const [first, setFirst] = useState(true);
  const [result, setResult] = useState<{ p: number; g: number; lv: number; coins: number; record: boolean; finished: Mission[] } | null>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setPh = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const sync = () => { const k = s.current; setHud({ p: k.points, g: k.goals, lv: k.level, lives: k.lives, streak: k.streak }); };

  const finishRound = () => {
    const k = s.current, p = progRef.current;
    const round = { goals: k.goals, corners: k.corners, streak: k.bestStreak, targets: k.targets, level: k.level, curls: k.curls, points: k.points };
    const { state, finished } = settle(KICK_MISSIONS, p.missions, round);
    const bonus = finished.reduce((a, x) => a + x.reward, 0);
    save({ ...p, best: Math.max(p.best, k.points), bestLevel: Math.max(p.bestLevel, k.level), wallet: p.wallet + k.coins + bonus, missions: state }, true);
    setResult({ p: k.points, g: k.goals, lv: k.level, coins: k.coins + bonus, record: k.points > p.best && k.points > 0, finished });
    setPh('over');
  };

  const shoot = (shot: ReturnType<typeof shotAt>) => {
    if (phaseRef.current !== 'aim' || pausedRef.current || s.current.flight) return;
    kick(s.current, shot, progRef.current.up);
    trail.current = []; setFirst(false); setPh('flight');
  };

  const restart = () => {
    s.current = newKick(progRef.current.up); trail.current = [];
    setResult(null); sync(); setPh('aim');
  };

  useEffect(() => {
    let raf = 0, last = performance.now(), doneT = -1, trailT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const c = canvas.current, ctx = c?.getContext('2d');
      if (c && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = c.clientWidth, H = c.clientHeight;
        if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const v = view.current; v.W = W; v.H = H; layoutKick(v);
        const k = s.current;
        if (!pausedRef.current) {
          const wasDone = k.flight?.done;
          advance(k, dt);
          const f = k.flight;
          if (f && !f.done) { trailT += dt; if (trailT > 0.016) { trailT = 0; trail.current.push({ x: f.x, y: f.y, z: f.z }); if (trail.current.length > 12) trail.current.shift(); } }
          if (f?.done && !wasDone && k.last) {
            setMsg({ text: k.last.text, good: k.last.outcome === 'tor', id: now });
            if (k.last.outcome === 'tor') cheer.current = 1;
            doneT = now; sync();
          }
          if (f?.done && doneT > 0 && now - doneT > 1300) {
            doneT = -1; trail.current = [];
            if (k.over) finishRound(); else { setupRound(k); setPh('aim'); }
          }
          if (f?.done && trail.current.length) trail.current.shift();
        }
        cheer.current = Math.max(0, cheer.current - dt * 0.5);
        const ball = BALLS.find((b) => b.id === progRef.current.ball) ?? BALLS[0];
        drawKick(ctx, v, k, ball, now / 1000, cheer.current, phaseRef.current === 'aim' ? aim.current : null, trail.current, reduced);
        // Wischspur
        const sw = swipe.current;
        if (sw && sw.length > 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); sw.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (pausedRef.current || phaseRef.current !== 'aim' || (e.target as HTMLElement)?.tagName === 'BUTTON') return;
      const a = aim.current ?? { x: 0, y: 1.2 };
      const mv: Record<string, [number, number]> = { ArrowLeft: [-0.3, 0], ArrowRight: [0.3, 0], ArrowUp: [0, 0.2], ArrowDown: [0, -0.2] };
      if (mv[e.key]) {
        e.preventDefault();
        aim.current = { x: Math.max(-GOAL_W - 0.5, Math.min(GOAL_W + 0.5, a.x + mv[e.key][0])), y: Math.max(0.15, Math.min(GOAL_H + 0.5, a.y + mv[e.key][1])) };
      } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); aim.current = a; shoot(shotAt(a.x, a.y, progRef.current.up)); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 1300); return () => clearTimeout(t); }, [msg]);
  useEffect(() => { if (!sheet && phaseRef.current === 'aim' && !s.current.shots) s.current = newKick(progRef.current.up); sync(); }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: React.PointerEvent): Pt => { const r = canvas.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() / 1000 }; };
  const touch = {
    onPointerDown: (e: React.PointerEvent) => {
      if (pausedRef.current || phaseRef.current !== 'aim' || e.target !== canvas.current) return;
      canvas.current!.setPointerCapture?.(e.pointerId);
      swipe.current = [pos(e)];
    },
    onPointerMove: (e: React.PointerEvent) => { if (swipe.current) swipe.current.push(pos(e)); },
    onPointerUp: (e: React.PointerEvent) => {
      const sw = swipe.current; swipe.current = null;
      if (!sw) return;
      sw.push(pos(e));
      const H = view.current.H, a = sw[0], b = sw[sw.length - 1];
      const dx = (b.x - a.x) / H, dy = (a.y - b.y) / H;
      if (Math.hypot(dx, dy) < 0.04) {
        const g = unprojectGoal(view.current, b.x, b.y);
        if (Math.abs(g.x) < GOAL_W + 1 && g.y > -0.2 && g.y < GOAL_H + 1) shoot(shotAt(g.x, Math.max(0.15, g.y), progRef.current.up));
        return;
      }
      if (dy < 0.03) return;
      // Effet: grösste seitliche Abweichung der Geste von der geraden Linie
      let bend = 0;
      for (const p of sw) {
        const u = (a.y - p.y) / Math.max(1, a.y - b.y);
        const off = (p.x - (a.x + (b.x - a.x) * u)) / H;
        if (Math.abs(off) > Math.abs(bend)) bend = off;
      }
      // Gerade Gesten ohne Effet
      if (Math.abs(bend) < 0.02) bend = 0;
      shoot(shotFromSwipe(dx, dy, Math.max(0.05, b.t - a.t), bend, progRef.current.up));
    },
    onPointerCancel: () => { swipe.current = null; },
  };

  const buyBall = (id: string, price: number) => {
    const p = progRef.current;
    if (p.balls.includes(id)) return save({ ...p, ball: id });
    if (p.wallet < price) return;
    save({ ...p, wallet: p.wallet - price, balls: [...p.balls, id], ball: id }, true);
  };
  const buyUp = (id: keyof KickProgress['up'], price: number) => {
    const p = progRef.current;
    if (p.wallet < price) return;
    save({ ...p, wallet: p.wallet - price, up: { ...p.up, [id]: p.up[id] + 1 } }, true);
  };

  return (
    <div className="jp kk" {...touch}>
      <canvas ref={canvas} className="jp-canvas" role="img" aria-label={`Fussballtor mit Torhüter, Level ${hud.lv}. Wische vom Ball zum Tor oder tippe ins Tor. Mit Pfeiltasten zielen und Leertaste schiessen.`} />
      <div className="hr-hud" aria-hidden={phase === 'over'}>
        <div className="hr-stat"><b>{hud.p}</b> Punkte</div>
        <div className="hr-stat">Level <b>{hud.lv}</b></div>
        <div className="hr-stat kk-lives" aria-label={`${hud.lives} Bälle übrig`}>{Array.from({ length: hud.lives }, (_, i) => <i key={i} />)}</div>
        {hud.streak > 1 && <div className="hr-stat kk-streak">Serie <b>×{Math.min(5, hud.streak)}</b></div>}
      </div>
      <div className="hr-event-wrap kk-msg" aria-live="assertive">{msg && <div key={msg.id} className="hr-event" style={msg.good ? undefined : { background: '#C8372D', color: '#FFFFFF' }}>{msg.text}</div>}</div>
      {first && phase === 'aim' && !over && !sheet && (
        <div className="kk-hint" role="status">
          <b>Wische vom Ball Richtung Tor!</b> Schnell wischen = harter Schuss. Im Bogen wischen = Bananenflanke. Oder einfach ins Tor tippen.
        </div>
      )}
      {phase === 'over' && result && !over && !sheet && (
        <RoundOver title="Abpfiff!" record={result.record ? 'Neuer Rekord!' : undefined}
          stats={[[result.p, 'Punkte'], [result.g, 'Tore'], [result.lv, 'Level'], [<><Coin size={18} /> {result.coins}</>, 'Münzen']]}
          finished={result.finished} unit={<Coin size={14} />}>
          <button type="button" className="kit-btn soft" onClick={() => setSheet(true)}>Shop &amp; Aufträge</button>
          <button type="button" className="kit-btn" autoFocus onClick={restart}>Neues Spiel</button>
        </RoundOver>
      )}
      {sheet && (
        <Sheet title="Shop & Aufträge" wallet={<><Coin /> {prog.wallet}</>} onClose={() => setSheet(false)}>
          <h3>Aufträge</h3>
          <MissionList list={KICK_MISSIONS} state={prog.missions} unit={<Coin size={14} />} />
          <h3>Training</h3>
          {KICK_UPGRADES.map((u) => {
            const lv = prog.up[u.id], max = u.prices.length, price = u.prices[lv];
            return <ShopRow key={u.id} name={u.name} desc={u.desc} preview={<Pips n={lv} max={max} />} state={lv >= max ? 'max' : 'buy'} price={price}
              unit={<Coin size={14} />} canPay={prog.wallet >= (price ?? Infinity)} onClick={() => buyUp(u.id, price)} />;
          })}
          <h3>Bälle</h3>
          {BALLS.map((b) => (
            <ShopRow key={b.id} name={b.name} preview={<BallPreview id={b.id} />}
              state={prog.ball === b.id ? 'active' : prog.balls.includes(b.id) ? 'use' : 'buy'} price={b.price}
              unit={<Coin size={14} />} canPay={prog.wallet >= b.price} onClick={() => buyBall(b.id, b.price)} />
          ))}
        </Sheet>
      )}
    </div>
  );
}

function BallPreview({ id }: { id: string }) {
  const b = BALLS.find((x) => x.id === id)!;
  const patch = (i: number) => (b.patch === 'rainbow' ? `hsl(${i * 72},85%,55%)` : b.patch);
  return (
    <svg aria-hidden="true" width="44" height="44" viewBox="-12 -12 24 24">
      <defs><clipPath id={`bc-${id}`}><circle r="11" /></clipPath></defs>
      <circle r="11" fill={b.base} stroke="rgba(0,0,0,0.35)" />
      <g clipPath={`url(#bc-${id})`}>
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={Math.cos((i * Math.PI * 2) / 5) * 8.2} cy={Math.sin((i * Math.PI * 2) / 5) * 8.2} r="3.5" fill={patch(i)} />)}
        <circle r="3.3" fill={b.patch === 'rainbow' ? '#F2B33D' : b.patch} />
      </g>
    </svg>
  );
}
