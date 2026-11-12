import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { currentEntries, isDone, SHORT_DAYS, tomorrowTests, upcomingEvents, eventShort } from '../../store/selectors';
import { lockReason } from '../../store/rules';
import { WEEKDAYS } from '../../store/constants';
import { SUBJECTS, EVENT_TYPES, GAMES } from '../../data/subjects';
import { StudentHeader } from '../../components/StudentHeader';
import { HausiWave } from '../../components/Hausi';
import { IconBell, IconCalendar, IconChevronRight, IconImage, SubjectIcon } from '../../components/icons';
import { useKid } from './useKid';
import './Uebersicht.css';

const PRAISE = ['Los geht’s!', 'Super Start!', 'Weiter so!', 'Fast geschafft!', 'Alles fertig – toll!'];
const STATUS = {
  abgegeben: { text: 'Abgegeben', bg: '#DDE7F7', fg: '#1F4E8C' },
  korrigiert: { text: 'Korrigiert', bg: '#DCEFE2', fg: '#1E5E37' },
  nichtgemacht: { text: 'Nicht gemacht', bg: '#FBE1DE', fg: '#9B2A22' },
} as const;

export function Uebersicht() {
  const { student, data } = useKid();
  const entries = currentEntries(data, student.id);
  const thisWeek = entries.filter((e) => e.hw.dueWeekOffset === 0);
  const done = thisWeek.filter((e) => isDone(e.sub)).length;
  const openCount = entries.filter((e) => e.sub.status === 'offen').length;
  const test = tomorrowTests(data)[0];
  const next = upcomingEvents(data, 2);
  const settings = data.settings;
  const pendingReward = data.submissions.find((s) => s.studentId === student.id && isDone(s) && s.rewardUsed === false);
  const ratio = thisWeek.length ? done / thisWeek.length : 0;
  const praise = PRAISE[Math.min(4, Math.round(ratio * 4))];

  return (
    <div className="app">
      <StudentHeader studentId={student.id} />
      <main className="ov grid-bg">
        <section className="ov-main">
          <div className="ov-hello">
            <HausiWave size={64} />
            <div>
              <h1>Hallo {student.name}!</h1>
              <p>{openCount > 0 ? `Du hast noch ${openCount} Hausaufgabe${openCount === 1 ? '' : 'n'}. Du schaffst das!` : 'Alle Hausaufgaben erledigt – super gemacht!'}</p>
            </div>
          </div>
          {test && (
            <Link to="/kind/agenda" className="ov-reminder">
              <IconBell size={24} />
              <span><b>Erinnerung: Morgen ist der {eventShort(test)}</b>{test.time && ` um ${test.time}`}.{test.note && ` ${test.note.replace(/:$/, '')}.`}</span>
              <span aria-hidden="true" className="ov-reminder-arrow">›</span>
            </Link>
          )}
          <div className="ov-progress">
            <span className="ov-progress-text">Diese Woche: {done} von {thisWeek.length} erledigt</span>
            <div className="bar" role="progressbar" aria-label="Wochen-Fortschritt" aria-valuemin={0} aria-valuemax={thisWeek.length} aria-valuenow={done}>
              <div style={{ width: `${Math.max(4, ratio * 100)}%` }} />
            </div>
            <span className="ov-praise" aria-live="polite" style={ratio === 1 ? { background: 'var(--success)', color: '#FFFFFF' } : undefined}>{praise}</span>
          </div>
          {pendingReward && lockReason(student) === 'keine' && (
            <Link to={`/kind/belohnung/${pendingReward.id}`} className="ov-pending">
              Du hast noch <b>1 Spiel</b> offen – jetzt spielen ›
            </Link>
          )}
          <ul className="ov-list">
            {entries.map(({ hw, sub }) => {
              const m = SUBJECTS[hw.subject];
              const st = sub.status !== 'offen' ? STATUS[sub.status] : null;
              const to = sub.status === 'korrigiert' ? `/kind/korrektur/${hw.id}` : `/kind/aufgabe/${hw.id}`;
              return (
                <li key={hw.id}>
                  <Link to={to} className={`ov-card${hw.important && sub.status === 'offen' ? ' important' : ''}${st ? ' done' : ''}`} style={{ background: m.cardBg }}>
                    <div className="ov-card-icon" style={{ background: m.dark }}><SubjectIcon subject={hw.subject} size={34} /></div>
                    <div className="ov-card-body">
                      <div className="ov-card-tags">
                        <span style={{ color: m.text }} className="ov-card-subject">{m.label.toUpperCase()}</span>
                        {hw.important && sub.status === 'offen' && <span className="tag-important">WICHTIG</span>}
                        {st && <span className="tag-status" style={{ background: st.bg, color: st.fg }}>{st.text}</span>}
                      </div>
                      <div className="ov-card-title">{hw.title}</div>
                      <div className="ov-card-due" style={{ color: m.muted }}>
                        Abgabe: {hw.dueWeekOffset === 1 ? 'nächsten ' : ''}{WEEKDAYS[hw.dueWeekday]}
                      </div>
                    </div>
                    <IconChevronRight size={28} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="ov-aside">
          {settings.startImage ? (
            <img className="ov-start-img" src={settings.startImage} alt="Bild der Lehrerin für die Startseite" />
          ) : (
            <div className="ov-start-ph">
              <IconImage size={40} />
              <div className="ov-start-ph-title">Bild der Lehrerin</div>
              <div>Die Lehrerin gestaltet diese Startseite selbst.</div>
            </div>
          )}
          <div className="ov-reward">
            <div className="ov-reward-label">DEINE BELOHNUNG</div>
            <div className="ov-reward-text">Nach jeder Abgabe darfst du <b>1 Spiel</b> spielen – bis zu <b>{settings.maxMinutes} Minuten</b>.</div>
            <ul>
              {settings.allowedGames.map((g) => (
                <li key={g}><span aria-hidden="true" style={{ background: GAMES[g].color }} />{GAMES[g].name}</li>
              ))}
            </ul>
          </div>
          <Link to="/kind/agenda" className="ov-next">
            <div className="ov-next-head">
              <span className="ov-next-title"><IconCalendar size={20} />NÄCHSTE TERMINE</span>
              <span className="ov-next-link">Agenda öffnen ›</span>
            </div>
            {next.map((e) => {
              const t = EVENT_TYPES[e.type];
              const day = `${e.weekOffset === 1 ? 'nächsten ' : ''}${SHORT_DAYS[e.weekday]}${e.time ? `, ${e.time}` : ''}`;
              return (
                <div key={e.id} className="ov-next-item" style={{ background: t.light, borderColor: e.type === 'test' ? t.dark : 'transparent' }}>
                  <span className="ov-next-badge" style={{ background: t.dark }}>{t.label}</span>
                  <span className="ov-next-when">{e.type === 'test' ? `${eventShort(e).replace(/-Test$/, '')} · ` : ''}{day}</span>
                </div>
              );
            })}
          </Link>
        </aside>
      </main>
    </div>
  );
}
