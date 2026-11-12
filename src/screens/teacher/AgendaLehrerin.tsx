import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { act, errorText } from '../../store/actions';
import { CLASS_NAME, WEEKDAYS, dateLabel } from '../../store/constants';
import type { EventType, Weekday, WeekOffset } from '../../store/types';
import { EVENT_TYPES } from '../../data/subjects';
import { AgendaWeek } from '../../components/AgendaWeek';
import { TeacherSubHeader } from './TeacherHeader';
import './teacher.css';

export function AgendaLehrerin() {
  const data = useStore((s) => s.data);
  const [week, setWeek] = useState<WeekOffset>(0);
  const [type, setType] = useState<EventType>('test');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<Weekday>(2);
  const [time, setTime] = useState('08:15');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    try {
      await act.addEvent({ weekOffset: week, weekday: day, type, title, time: time || undefined, note });
      setMsg({ ok: true, text: `«${title.trim()}» steht jetzt am ${WEEKDAYS[day]}, ${dateLabel(week, day)} in der Agenda.` });
      setTitle(''); setNote('');
    } catch (e) { setMsg({ ok: false, text: errorText(e) }); }
  };

  return (
    <div className="app">
      <TeacherSubHeader title="Agenda · Termine eintragen" />
      <main className="t-agenda">
        <section className="t-card" style={{ background: 'transparent', padding: 0 }}>
          <AgendaWeek data={data} week={week} onWeek={setWeek} onDelete={(id) => {
            const ev = data.events.find((e) => e.id === id);
            if (ev && window.confirm(`Termin «${ev.title}» löschen?`)) act.deleteEvent(id).catch((e) => setMsg({ ok: false, text: errorText(e) }));
          }} />
          <div className="t-muted">Abgaben kommen automatisch aus den Hausaufgaben und lassen sich hier nicht löschen.</div>
        </section>
        <aside className="t-card" aria-labelledby="ev-h">
          <h2 id="ev-h">Neuer Termin</h2>
          <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
            <div className="t-field"><span id="ev-type">Art</span>
              <div className="t-chips" role="group" aria-labelledby="ev-type">
                {(['test', 'bib', 'ausflug', 'sonst'] as EventType[]).map((t) => {
                  const on = t === type;
                  return <button key={t} type="button" aria-pressed={on} onClick={() => setType(t)}
                    style={{ borderColor: EVENT_TYPES[t].dark, background: on ? EVENT_TYPES[t].dark : EVENT_TYPES[t].light, color: on ? '#FFFFFF' : EVENT_TYPES[t].dark }}>{EVENT_TYPES[t].label}</button>;
                })}
              </div>
            </div>
            <label className="t-field">Titel<input value={title} onChange={(e) => { setTitle(e.target.value); setMsg(null); }} placeholder="z. B. Mathe-Test: Brüche" /></label>
            <div className="t-row">
              <label className="t-field" style={{ flex: '1 1 150px' }}>Tag
                <select value={day} onChange={(e) => setDay(Number(e.target.value) as Weekday)}>
                  {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}, {dateLabel(week, i)}</option>)}
                </select>
              </label>
              <label className="t-field" style={{ flex: '0 1 150px' }}>Uhrzeit<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            </div>
            <label className="t-field">Hinweis für die Kinder (freiwillig)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Lernen: Seite 34–37" /></label>
            <div aria-live="polite">{msg && <div className={msg.ok ? 'msg-ok' : 'msg-error'}>{msg.text}</div>}</div>
            <button type="submit" className="t-primary">In die Agenda eintragen</button>
          </form>
          <div className="t-info">Alle Kinder der Klasse {CLASS_NAME} sehen die Termine in ihrer Agenda. Tests werden rot umrandet, damit niemand sie vergisst.</div>
        </aside>
      </main>
    </div>
  );
}
