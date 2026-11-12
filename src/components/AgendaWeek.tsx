import { useState } from 'react';
import { DEMO_TODAY, WEEKDAYS, dateLabel, weekTitle } from '../store/constants';
import { agendaItems, type AgendaItem } from '../store/selectors';
import type { DemoData, WeekOffset } from '../store/types';
import { EVENT_TYPES } from '../data/subjects';
import { IconBack, IconChevronRight, IconX } from './icons';
import { useMedia } from '../utils/useMedia';
import './AgendaWeek.css';

const BADGE: Record<WeekOffset, string> = { [-1]: 'Letzte Woche', 0: 'Diese Woche', 1: 'Nächste Woche' };

interface Props {
  data: DemoData;
  week: WeekOffset;
  onWeek: (w: WeekOffset) => void;
  onDelete?: (id: string) => void;
}

/** Wochenansicht Mo–Fr mit Pfeilen; auf schmalen Bildschirmen ein Tag pro Seite (Tabs + Wischen). */
export function AgendaWeek({ data, week, onWeek, onDelete }: Props) {
  const narrow = useMedia('(max-width: 759px)');
  const [day, setDay] = useState<number>(week === 0 ? DEMO_TODAY.weekday : 0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const items = agendaItems(data, week);
  const arrow = (dir: -1 | 1) => {
    const w = week + dir;
    const on = w >= -1 && w <= 1;
    return (
      <button type="button" className="ag-arrow" disabled={!on} aria-label={dir < 0 ? 'Vorherige Woche' : 'Nächste Woche'}
        onClick={() => { onWeek(w as WeekOffset); setDay(w === 0 ? DEMO_TODAY.weekday : 0); }}>
        {dir < 0 ? <IconBack size={20} /> : <IconChevronRight size={20} />}
      </button>
    );
  };
  const renderDay = (i: number) => {
    const list = items.filter((e) => e.weekday === i);
    const today = week === 0 && i === DEMO_TODAY.weekday;
    return (
      <div key={i} className={`ag-day${today ? ' today' : ''}`} role={narrow ? 'tabpanel' : undefined} id={narrow ? `ag-panel-${i}` : undefined}>
        <div className="ag-day-head">
          <span className="ag-day-name">{WEEKDAYS[i]}{today && <span className="ag-today">Heute</span>}</span>
          <span className="ag-day-date">{dateLabel(week, i)}</span>
        </div>
        {list.map((e) => <Item key={e.id} e={e} onDelete={onDelete} />)}
        {list.length === 0 && <div className="ag-empty">Keine Termine</div>}
      </div>
    );
  };

  return (
    <div className="ag">
      <div className="ag-top">
        <div className="ag-nav">
          {arrow(-1)}
          <h1 aria-live="polite">{weekTitle(week)}</h1>
          {arrow(1)}
          <span className="ag-badge">{BADGE[week]}</span>
        </div>
        <div className="ag-legend">
          {(['test', 'bib', 'ausflug', 'sonst', 'abgabe'] as const).map((k) => (
            <span key={k} style={{ color: EVENT_TYPES[k].dark, background: EVENT_TYPES[k].light }}>{EVENT_TYPES[k].label}</span>
          ))}
        </div>
      </div>
      {narrow ? (
        <>
          <div className="ag-tabs" role="tablist" aria-label="Wochentag">
            {WEEKDAYS.map((d, i) => (
              <button key={d} type="button" role="tab" aria-selected={day === i} aria-controls={`ag-panel-${i}`} onClick={() => setDay(i)}>
                {d.slice(0, 2)}<span>{dateLabel(week, i)}</span>
              </button>
            ))}
          </div>
          <div className="ag-swipe" onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX === null) return;
              const dx = e.changedTouches[0].clientX - touchX;
              if (Math.abs(dx) > 50) setDay((d) => Math.min(4, Math.max(0, d + (dx < 0 ? 1 : -1))));
              setTouchX(null);
            }}>
            {renderDay(day)}
          </div>
        </>
      ) : (
        <div className="ag-grid">{[0, 1, 2, 3, 4].map(renderDay)}</div>
      )}
    </div>
  );
}

function Item({ e, onDelete }: { e: AgendaItem; onDelete?: (id: string) => void }) {
  const t = EVENT_TYPES[e.type];
  return (
    <div className={`ag-item${e.type === 'abgabe' ? ' due' : ''}`} style={{ background: t.light, borderColor: e.type === 'test' ? t.dark : 'transparent' }}>
      <div className="ag-item-top">
        <span className="ag-item-badge" style={{ background: t.dark }}>{t.label}</span>
        <span className="ag-item-time">{e.time}</span>
        {onDelete && e.own && (
          <button type="button" className="ag-del" aria-label={`Termin «${e.title}» löschen`} onClick={() => onDelete(e.id)}><IconX size={16} /></button>
        )}
      </div>
      <div className="ag-item-title">{e.title}</div>
      {e.note && <div className="ag-item-note">{e.note}</div>}
    </div>
  );
}
