import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_GARAGE as GARAGE0, PRICES } from '../../store/rules';
import { act, errorText } from '../../store/actions';
import type { Garage } from '../../store/types';
import { Coin, IconBack } from '../../components/icons';
import { useKid } from './useKid';
import './Shop.css';

export const DEFAULT_GARAGE: Garage = GARAGE0;

import { SHAPES } from '../../games/hill/cars';
import { carStats } from '../../games/hill/engine';
const TUNING = [
  { id: 'felgen', name: 'Goldene Felgen', desc: 'Mehr Grip am Hang', price: PRICES.felgen },
  { id: 'spoiler', name: 'Spoiler', desc: 'Ruhiger in der Luft – kippt weniger', price: PRICES.spoiler },
  { id: 'turbo', name: 'Turbo', desc: 'Mehr Kraft und Tempo', price: PRICES.turbo },
];
const CARS = [
  { id: 'flitzer', price: 0, desc: 'Dein erstes Auto – gut für den Anfang', dot: '#E0352B' },
  { id: 'bus', price: PRICES.bus, desc: 'Schwer und stabil – kippt kaum um', dot: '#1F4E8C' },
  { id: 'gelaende', price: PRICES.gelaende, desc: 'Grosse Räder, viel Grip am Berg', dot: '#2F7D4F' },
  { id: 'renner', price: PRICES.renner, desc: 'Sehr schnell, aber kippelig', dot: '#F2B33D' },
];
const COLORS: [string, string][] = [['#E0352B', 'Rot'], ['#1F4E8C', 'Blau'], ['#2F7D4F', 'Grün'], ['#F2B33D', 'Gelb'], ['#FFFFFF', 'Weiss']];

export function CarPreview({ g, width = 438 }: { g: Garage; width?: number }) {
  const s = SHAPES[g.activeCar];
  const rim = g.tuning.includes('felgen') ? '#F2B33D' : '#B8B8B8';
  return (
    <svg role="img" aria-label={`${s.name} in der Garage`} width="100%" style={{ maxWidth: width, display: 'block', borderRadius: 14, background: '#1E2A44' }} viewBox="0 0 200 96">
      <rect x="0" y="74" width="200" height="22" fill="#3A3A3A" /><rect x="0" y="74" width="200" height="2" fill="#F2B33D" />
      {g.tuning.includes('spoiler') && <><rect x="26" y="40" width="22" height="4" rx="1" fill="#111111" /><rect x="34" y="43" width="3" height="10" fill="#111111" /></>}
      <path d={s.body} fill={g.color} /><path d={s.win} fill="#9FB3D9" />
      <rect x="48" y="58" width="100" height="3" fill="#FFFFFF" opacity="0.8" />
      {g.tuning.includes('turbo') && <g stroke="#F2B33D" strokeWidth="3" strokeLinecap="round"><line x1="4" y1="56" x2="22" y2="56" /><line x1="8" y1="64" x2="24" y2="64" /></g>}
      <circle cx="60" cy="72" r="11" fill="#111111" /><circle cx="60" cy="72" r="5.5" fill={rim} />
      <circle cx="146" cy="72" r="11" fill="#111111" /><circle cx="146" cy="72" r="5.5" fill={rim} />
    </svg>
  );
}

export function Shop() {
  const { data, student } = useKid();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const g = data.garages[student.id] ?? DEFAULT_GARAGE;
  const money = student.coins;
  const inGame = data.gameSession?.game === 'auto';

  const spend = async (price: number, item: string, okText: string) => {
    if (money < price) {
      setMsg({ ok: false, text: `Zu wenig Spielgeld. Du brauchst noch ${price - Math.max(0, money)}. Mach eine Hausaufgabe!` });
      return;
    }
    try { await act.shop(student.id, item); setMsg({ ok: true, text: okText }); }
    catch (e) { setMsg({ ok: false, text: errorText(e) }); }
  };
  const btnClass = (enabled: boolean, owned: boolean) => `shop-btn${owned ? ' owned' : enabled ? '' : ' poor'}`;

  return (
    <div className="app shop-app">
      <header className="app-header shop-header">
        <Link to={inGame ? '/kind/spiel/auto' : '/kind'} className="header-back"><IconBack size={22} />{inGame ? 'Weiterfahren' : 'Übersicht'}</Link>
        <div className="header-center">Auto-Welt · Garage &amp; Shop</div>
        <div className="shop-money"><Coin size={26} /><span aria-live="polite">{money} Spielgeld</span></div>
      </header>
      <main className="shop">
        <section className="shop-left">
          <div className="shop-car">
            <div className="shop-car-label">MEIN AUTO</div>
            <CarPreview g={g} />
            <div className="shop-car-name">{SHAPES[g.activeCar].name}{g.best ? <span className="shop-best">Rekord: {g.best} m</span> : null}</div>
            <dl className="shop-stats">
              {Object.entries(carStats(g)).map(([k, v]) => (
                <div key={k}>
                  <dt>{({ tempo: 'Tempo', kraft: 'Kraft', grip: 'Grip', stabil: 'Stabilität' } as Record<string, string>)[k]}</dt>
                  <dd aria-label={`${v} von 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= v ? 'on' : ''} />)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="shop-card">
            <div className="shop-card-title">Farbe ändern <span>· {PRICES.color} Spielgeld</span></div>
            <div role="group" aria-label="Autofarbe" className="shop-colors">
              {COLORS.map(([c, label]) => (
                <button key={c} type="button" aria-label={label} aria-pressed={g.color === c} style={{ background: c }}
                  onClick={() => { if (g.color !== c) spend(PRICES.color, `color:${c}`, `Neue Farbe: ${label}!`); }} />
              ))}
            </div>
          </div>
          <div className="shop-note"><b>Nur Spielgeld – kein echtes Geld.</b> Mehr Spielgeld bekommst du für jede Hausaufgabe. Fehlerfrei = doppelt!</div>
        </section>
        <section className="shop-right">
          <div className="shop-card">
            <div className="shop-card-title big">Tuning für dein Auto</div>
            {TUNING.map((t) => {
              const owned = g.tuning.includes(t.id);
              return (
                <div key={t.id} className="shop-row">
                  <div className="shop-row-text"><div className="shop-row-name">{t.name}</div><div className="shop-row-desc">{t.desc}</div></div>
                  <button type="button" className={btnClass(money >= t.price, owned)} disabled={owned}
                    onClick={() => spend(t.price, `tuning:${t.id}`, `${t.name} eingebaut!`)}>
                    {owned ? 'Eingebaut' : `${t.price} kaufen`}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="shop-card">
            <div className="shop-card-title big">Neue Autos</div>
            {CARS.map((c) => {
              const owned = g.ownedCars.includes(c.id);
              const active = g.activeCar === c.id;
              return (
                <div key={c.id} className="shop-row">
                  <span aria-hidden="true" className="shop-dot" style={{ background: c.dot }} />
                  <div className="shop-row-text">
                    <div className="shop-row-name">{SHAPES[c.id].name}</div>
                    <div className="shop-row-desc">{owned ? (active ? 'Fährst du gerade' : 'Gehört dir') : c.desc}</div>
                  </div>
                  <button type="button" className={btnClass(owned || money >= c.price, active)} disabled={active}
                    onClick={() => {
                      if (owned) { act.shop(student.id, `drive:${c.id}`).then(() => setMsg(null), (e) => setMsg({ ok: false, text: errorText(e) })); }
                      else spend(c.price, `car:${c.id}`, `${SHAPES[c.id].name} gekauft!`);
                    }}>
                    {active ? 'Ausgewählt' : owned ? 'Fahren' : `${c.price} kaufen`}
                  </button>
                </div>
              );
            })}
          </div>
          <div aria-live="polite">{msg && <div className={msg.ok ? 'msg-ok shop-msg' : 'msg-error shop-msg'}>{msg.text}</div>}</div>
        </section>
      </main>
    </div>
  );
}
