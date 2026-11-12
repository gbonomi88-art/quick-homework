import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { GameFrame } from './GameFrame';
import {
  build, canBuild, CITY_MISSIONS, collect, COLS, DEFS, demolish, KINDS, loadCity, missionValues, neighbors4, stats, tick, upgrade, upgradeCost, welcomeBack,
  type City, type Kind,
} from './city/model';
import { KindIcon, Tile } from './city/Tiles';
import { settle } from './missions';
import { MissionList, Sheet, useProgress } from './kit';
import './city/city.css';

type Tool = Kind | 'hand' | 'abriss';

export const Taler = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#F2B33D" stroke="#C98A12" strokeWidth="1.5" /><text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="900" fill="#9A6400">T</text></svg>
);
const fmt = (n: number) => Math.floor(n).toLocaleString('de-CH');

/** Baumeister: Aufbau-Stadt mit Einwohnern, Läden, Freude und Aufträgen. */
export function Baumeister() {
  const old = useStore((s) => (s.session?.role === 'kid' ? s.data.buildCity[s.session.studentId] : undefined));
  const [initial, save] = useProgress('bau', (raw) => loadCity(raw, old));
  const [sheet, setSheet] = useState(false);
  const [city, setCity] = useState<City>(initial);
  const st = useMemo(() => stats(city), [city]);
  return (
    <GameFrame game="bau" label="Baumeister" light warnHint="bau noch schnell etwas Schönes!"
      overText={`Deine ${st.levelName} mit ${st.pop} Einwohnern ist gespeichert. Nach der nächsten Hausaufgabe kannst du weiterbauen – deine Bürger zahlen in der Zwischenzeit Steuern!`}
      score={<><Taler /> {fmt(city.money)}</>}
      extra={
        <button type="button" className="gf-pill accent" onClick={() => setSheet(true)} aria-label="Aufträge">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6v3H9z" /><path d="M7 6H5v15h14V6h-2" /><path d="M9 13l2 2 4-4" /></svg>
          <span className="pill-text">Aufträge</span>
        </button>
      }>
      {({ over }) => <Town over={over} city={city} setCity={setCity} save={save} sheet={sheet} setSheet={setSheet} />}
    </GameFrame>
  );
}

interface Pop { id: number; i: number; text: string }

function Town({ over, city, setCity, save, sheet, setSheet }: {
  over: boolean; city: City; setCity: (c: City) => void; save: (c: City, flush?: boolean) => void; sheet: boolean; setSheet: (b: boolean) => void;
}) {
  const [tool, setTool] = useState<Tool>('hand');
  const [info, setInfo] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; good?: boolean; id: number } | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const cityRef = useRef(city); cityRef.current = city;
  const collected = useRef(0);
  const lastSave = useRef(0);
  const st = useMemo(() => stats(city), [city]);

  const say = (text: string, good = false) => setToast({ text, good, id: Date.now() });
  const pop = (i: number, text: string) => { const id = Math.random(); setPops((p) => [...p, { id, i, text }]); setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900); };

  /** Neue Stadt übernehmen: Aufträge prüfen, speichern. */
  const commit = (next: City, flush = false) => {
    const values = { ...missionValues(stats(next)), collected: collected.current };
    collected.current = 0;
    const { state, finished } = settle(CITY_MISSIONS, next.missions, values);
    state.totals = { collected: state.totals.collected ?? 0 };
    let c = { ...next, missions: state, last: Date.now() };
    if (finished.length) {
      const bonus = finished.reduce((a, m) => a + m.reward, 0);
      c = { ...c, money: c.money + bonus, earned: c.earned + bonus };
      say(`Auftrag erledigt: ${finished.map((m) => m.text).join(', ')}! +${bonus} Taler`, true);
    }
    setCity(c);
    const now = Date.now();
    if (flush || now - lastSave.current > 3000) { lastSave.current = now; save(c, flush); }
  };

  // Willkommen zurück + Zeit läuft
  useEffect(() => {
    const { city: c, gained } = welcomeBack(cityRef.current, Date.now());
    if (gained > 0) say(`Willkommen zurück! Deine Bürger haben ${gained} Taler Steuern bezahlt.`, true);
    commit(c, true);
    const t = setInterval(() => { if (!document.hidden) commit(tick(cityRef.current, 0.5)); }, 500);
    return () => { clearInterval(t); save({ ...cityRef.current, last: Date.now() }, true); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const tap = (i: number) => {
    if (over) return;
    const c = cityRef.current, cell = c.cells[i];
    if (cell && cell.c >= 1 && tool !== 'abriss') {
      const r = collect(c, i); collected.current += r.gained; pop(i, `+${r.gained}`); return commit(r.city);
    }
    if (tool === 'abriss') {
      if (!cell) return;
      const r = demolish(c, i); pop(i, `+${fmt(r.money - c.money)}`); return commit(r, true);
    }
    if (tool === 'hand' || cell) { if (cell) setInfo(i); return; }
    const err = canBuild(c, tool, i, st);
    if (err === 'geld') return say(`Zu wenig Taler: ${DEFS[tool].name} kostet ${DEFS[tool].cost}.`);
    if (err === 'gesperrt') return say(`${DEFS[tool].name} gibt es ab ${DEFS[tool].unlock} Einwohnern.`);
    if (err) return;
    pop(i, `-${DEFS[tool].cost}`);
    commit(build(c, tool, i), true);
  };

  const roadsAt = (i: number): [boolean, boolean, boolean, boolean] => {
    const x = i % COLS, isRoad = (j: number) => city.cells[j]?.t === 'road';
    return [i >= COLS && isRoad(i - COLS), i + COLS < city.cells.length && isRoad(i + COLS), x > 0 && isRoad(i - 1), x < COLS - 1 && isRoad(i + 1)];
  };
  const unconnected = (i: number) => { const cell = city.cells[i]; return !!cell && DEFS[cell.t].needsRoad && !neighbors4(i).some((j) => city.cells[j]?.t === 'road'); };
  const progress = st.next ? Math.min(1, st.pop / st.next) : 1;
  const mood = st.pop ? st.joy.reduce((a, b, i) => a + (city.cells[i]?.t === 'house' || city.cells[i]?.t === 'tower' ? b : 0), 0) / Math.max(1, st.counts.house + st.counts.tower) : 0;
  const infoCell = info !== null ? city.cells[info] : null;

  return (
    <div className="city">
      <div className="city-bar" role="group" aria-label="Deine Stadt">
        <div className="city-chip"><b>{st.levelName}</b>
          <div className="city-lv" role="progressbar" aria-label="Fortschritt zur nächsten Stadtstufe" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><div style={{ width: `${progress * 100}%` }} /></div>
        </div>
        <div className="city-chip" title="Einwohner"><span aria-hidden="true">👪</span> <b>{st.pop}</b>{st.next && <small> / {st.next}</small>} Einw.</div>
        <div className="city-chip" title="Einkommen"><Taler /> <b>+{st.perSec.toFixed(1)}</b>/s</div>
        <div className="city-chip" title="Zufriedenheit"><span aria-hidden="true">{mood >= 2 ? '😄' : mood >= 0.5 ? '🙂' : mood >= 0 ? '😐' : '😟'}</span> Freude</div>
        {st.jobs > 0 && st.work < 1 && <div className="city-chip warn">Zu wenig Arbeiter: Baue mehr Häuser!</div>}
        {st.unconnected > 0 && <div className="city-chip warn">{st.unconnected} Gebäude ohne Strasse</div>}
      </div>
      <div className="city-main">
        <div className="city-tools" role="group" aria-label="Werkzeug">
          {(['hand', ...KINDS, 'abriss'] as Tool[]).map((t) => {
            const locked = t !== 'hand' && t !== 'abriss' && st.pop < DEFS[t].unlock;
            const label = t === 'hand' ? 'Ansehen' : t === 'abriss' ? 'Abreissen' : DEFS[t].name;
            return (
              <button key={t} type="button" aria-pressed={tool === t} className={locked ? 'locked' : ''} onClick={() => { setTool(t); if (locked) say(`${label} gibt es ab ${DEFS[t as Kind].unlock} Einwohnern.`); }}
                aria-label={locked ? `${label}, gesperrt bis ${DEFS[t as Kind].unlock} Einwohner` : t === 'hand' || t === 'abriss' ? label : `${label}, kostet ${DEFS[t].cost} Taler`}>
                <span className="city-ti">{t === 'hand' ? '👆' : t === 'abriss' ? '🧹' : <KindIcon kind={t} />}</span>
                <span className="city-tl">{label}</span>
                {t !== 'hand' && t !== 'abriss' && <span className="city-tc">{locked ? `🔒 ${DEFS[t].unlock}` : <><Taler size={12} />{DEFS[t].cost}</>}</span>}
              </button>
            );
          })}
        </div>
        <div className="city-grid-wrap">
          <div className={`city-grid tool-${tool}`}>
            {city.cells.map((cell, i) => (
              <button key={i} type="button" onClick={() => tap(i)}
                aria-label={`Feld ${i + 1}: ${cell ? `${DEFS[cell.t].name}${cell.l > 1 ? ` Stufe ${cell.l}` : ''}${cell.c >= 1 ? `, ${Math.floor(cell.c)} Taler abholen` : ''}${unconnected(i) ? ', braucht Strasse' : ''}` : 'leer'}`}>
                <Tile cell={cell} i={i} roads={cell?.t === 'road' ? roadsAt(i) : undefined} />
                {cell && cell.l > 1 && <span className="city-lvl">{'★'.repeat(cell.l - 1)}</span>}
                {cell && cell.c >= 1 && <span className={`city-coin${cell.c >= st.prodPerSec[i] * 44 ? ' full' : ''}`}><Taler size={14} />{Math.floor(cell.c)}</span>}
                {unconnected(i) && <span className="city-warn" aria-hidden="true">!</span>}
                {pops.filter((p) => p.i === i).map((p) => <span key={p.id} className="city-pop">{p.text}</span>)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="city-toast-wrap" aria-live="polite">{toast && <div key={toast.id} className={`city-toast${toast.good ? ' good' : ''}`}>{toast.text}</div>}</div>
      {infoCell && info !== null && !over && (
        <Sheet title={`${DEFS[infoCell.t].name}${infoCell.l > 1 ? ` · Stufe ${infoCell.l}` : ''}`} wallet={<><Taler /> {fmt(city.money)}</>} onClose={() => setInfo(null)}>
          <div className="city-info">
            <div className="city-info-art"><Tile cell={infoCell} i={info} roads={infoCell.t === 'road' ? roadsAt(info) : undefined} /></div>
            <div>
              <p>{DEFS[infoCell.t].desc}</p>
              {DEFS[infoCell.t].pop && <p><b>{DEFS[infoCell.t].pop![infoCell.l - 1]}</b> Einwohner{DEFS[infoCell.t].pop![infoCell.l] ? ` → nach Ausbau ${DEFS[infoCell.t].pop![infoCell.l]}` : ''}</p>}
              {DEFS[infoCell.t].income && <p><b>{st.prodPerSec[info].toFixed(1)}</b> Taler pro Sekunde{DEFS[infoCell.t].income![infoCell.l] ? ` → nach Ausbau ${DEFS[infoCell.t].income![infoCell.l]}` : ''}</p>}
              {unconnected(info) && <p className="city-bad">Braucht eine Strasse direkt daneben!</p>}
            </div>
          </div>
          <div className="kit-actions">
            {upgradeCost(infoCell) !== undefined && (
              <button type="button" className="kit-btn" disabled={city.money < upgradeCost(infoCell)} onClick={() => { commit(upgrade(city, info), true); pop(info, '★'); }}>
                Ausbauen für {upgradeCost(infoCell)} <Taler />
              </button>
            )}
            <button type="button" className="kit-btn soft" onClick={() => { commit(demolish(city, info), true); setInfo(null); }}>Abreissen</button>
          </div>
        </Sheet>
      )}
      {sheet && (
        <Sheet title="Aufträge" wallet={<><Taler /> {fmt(city.money)}</>} onClose={() => setSheet(false)}>
          <p className="kit-muted">Erledige Aufträge und bekomme Bonus-Taler. Deine Stadt wächst von Dorf über Kleinstadt bis zur Weltstadt!</p>
          <MissionList list={CITY_MISSIONS} state={city.missions} round={missionValues(st)} unit={<Taler size={14} />} />
          <h3>So funktioniert deine Stadt</h3>
          <ul className="city-help">
            <li>Häuser bringen Einwohner – jeder Einwohner zahlt Steuern.</li>
            <li>Läden und Fabriken füllen sich mit Talern: tippe sie an zum Einsammeln.</li>
            <li>Alles ausser Bäumen und Parks braucht eine Strasse daneben.</li>
            <li>Bäume, Parks und Schulen machen glücklich – glückliche Häuser haben mehr Einwohner.</li>
            <li>Tippe ein Gebäude an, um es auszubauen.</li>
          </ul>
        </Sheet>
      )}
    </div>
  );
}
