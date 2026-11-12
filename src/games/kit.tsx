import { useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store/useStore';
import { act } from '../store/actions';
import { active, progressOf, type Mission, type MissionState } from './missions';
import './kit.css';

type ProgGame = 'bau' | 'huepf' | 'tor';

/** Spielstand eines Spiels: einmal aus dem Store lesen, danach lokal führen und speichern. */
export function useProgress<T extends object>(game: ProgGame, load: (raw: unknown) => T): [T, (next: T, flush?: boolean) => void] {
  const kid = useStore((s) => (s.session?.role === 'kid' ? s.session.studentId : ''));
  const initial = useRef<T>();
  if (!initial.current) initial.current = load(useStore.getState().data.progress?.[kid]?.[game]);
  const [prog, setProg] = useState<T>(initial.current);
  const save = (next: T, flush = false) => { setProg(next); if (kid) act.saveProgress(kid, game, next, flush); };
  return [prog, save];
}

export const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3 1.2-6.5L2.5 8.9 9.1 8z" fill="#F2B33D" stroke="#C98A12" strokeWidth="1" /></svg>
);

export function MissionList({ list, state, round, unit }: { list: Mission[]; state: MissionState; round?: Record<string, number>; unit: ReactNode }) {
  const items = active(list, state);
  if (!items.length) return <p className="kit-muted">Alle Aufträge erledigt – du bist ein Profi!</p>;
  return (
    <ul className="kit-missions">
      {items.map((m) => {
        const p = Math.min(m.target, progressOf(m, state, round));
        return (
          <li key={m.id}>
            <div className="kit-m-text">{m.text}<span className="kit-m-rew">+{m.reward} {unit}</span></div>
            <div className="kit-bar" role="progressbar" aria-valuemin={0} aria-valuemax={m.target} aria-valuenow={p} aria-label={m.text}>
              <div style={{ width: `${(p / m.target) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RoundOver({ title, record, stats, finished, unit, children }: {
  title: string; record?: string; stats: [ReactNode, string][]; finished: Mission[]; unit: ReactNode; children: ReactNode;
}) {
  return (
    <div className="kit-over">
      <div role="alertdialog" aria-modal="true" aria-labelledby="kit-over-title" className="kit-box">
        <div id="kit-over-title" className="kit-title">{title}</div>
        {record && <div className="kit-record">{record}</div>}
        <div className="kit-stats">{stats.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        {finished.length > 0 && (
          <div className="kit-done" role="status">
            {finished.map((m) => <div key={m.id}>Auftrag erledigt: {m.text} <b>+{m.reward} {unit}</b></div>)}
          </div>
        )}
        <div className="kit-actions">{children}</div>
      </div>
    </div>
  );
}

export function Sheet({ title, wallet, onClose, children }: { title: string; wallet: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="kit-over" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="kit-sheet-title" className="kit-box kit-sheet">
        <div className="kit-sheet-head">
          <div id="kit-sheet-title" className="kit-title">{title}</div>
          <div className="kit-wallet">{wallet}</div>
          <button type="button" className="kit-x" aria-label="Schliessen" onClick={onClose} autoFocus>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="kit-sheet-body">{children}</div>
      </div>
    </div>
  );
}

/** Ein Eintrag im Spiel-Shop. */
export function ShopRow({ preview, name, desc, state, price, unit, canPay, onClick }: {
  preview?: ReactNode; name: string; desc?: string; state: 'buy' | 'use' | 'active' | 'max'; price?: number; unit: ReactNode; canPay: boolean; onClick: () => void;
}) {
  return (
    <div className={`kit-row${state === 'active' ? ' on' : ''}`}>
      {preview && <div className="kit-prev">{preview}</div>}
      <div className="kit-row-text"><b>{name}</b>{desc && <span>{desc}</span>}</div>
      {state === 'buy' && <button type="button" className="kit-buy" disabled={!canPay} onClick={onClick}>{price} {unit}</button>}
      {state === 'use' && <button type="button" className="kit-buy soft" onClick={onClick}>Wählen</button>}
      {state === 'active' && <span className="kit-tag">Aktiv</span>}
      {state === 'max' && <span className="kit-tag">Maximal</span>}
    </div>
  );
}

export const Pips = ({ n, max }: { n: number; max: number }) => (
  <span className="kit-pips" aria-label={`Stufe ${n} von ${max}`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</span>
);
