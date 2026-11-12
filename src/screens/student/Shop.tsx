import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_GARAGE as GARAGE0, PRICES } from '../../store/rules';
import { act, errorText } from '../../store/actions';
import type { Garage } from '../../store/types';
import { Coin, IconBack } from '../../components/icons';
import { useKid } from './useKid';
import './Shop.css';

export const DEFAULT_GARAGE: Garage = GARAGE0;

const SHAPES: Record<string, { name: string; body: string; win: string }> = {
  flitzer: { name: 'Stadtflitzer', body: 'M30 70 L36 57 Q50 51 72 49 L90 39 Q102 34 118 36 L138 47 Q158 49 164 58 L166 70 Z', win: 'M78 49 L93 41 Q102 38 114 40 L126 48 Z' },
  renner: { name: 'Rennwagen', body: 'M24 70 L30 60 Q60 56 84 52 L100 44 Q112 41 126 43 L146 52 Q170 54 176 62 L178 70 Z', win: 'M90 52 L104 46 Q112 44 122 45 L134 52 Z' },
  gelaende: { name: 'Geländewagen', body: 'M30 70 L30 50 Q32 44 40 44 L60 44 L70 30 L130 30 L142 44 L162 46 Q168 48 168 56 L168 70 Z', win: 'M76 33 L126 33 L136 44 L70 44 Z' },
  bus: { name: 'Mini-Bus', body: 'M26 70 L26 34 Q26 28 32 28 L150 28 Q162 28 166 40 L172 56 L172 70 Z', win: 'M36 34 L150 34 L160 46 L36 46 Z' },
};
const TUNING = [
  { id: 'felgen', name: 'Goldene Felgen', desc: 'Glänzende Räder', price: PRICES.felgen },
  { id: 'spoiler', name: 'Spoiler', desc: 'Sieht schnell aus', price: PRICES.spoiler },
  { id: 'turbo', name: 'Turbo', desc: 'Schneller beschleunigen', price: PRICES.turbo },
];
const CARS = [
  { id: 'flitzer', price: 0, desc: 'Dein erstes Auto', dot: '#E0352B' },
  { id: 'bus', price: PRICES.bus, desc: 'Platz für alle deine Freunde', dot: '#1F4E8C' },
  { id: 'gelaende', price: PRICES.gelaende, desc: 'Fährt auch über Stock und Stein', dot: '#2F7D4F' },
  { id: 'renner', price: PRICES.renner, desc: 'Flach, schnell und laut', dot: '#F2B33D' },
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
            <div className="shop-car-name">{SHAPES[g.activeCar].name}</div>
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
