import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { changeCoinsPerSubmission, markNotDone, setMaxMinutes, setSetting, toggleGame, RuleError } from '../../store/rules';
import { WEEKDAYS } from '../../store/constants';
import type { GameId, Homework } from '../../store/types';
import { GAMES, SUBJECTS } from '../../data/subjects';
import { resizeImage } from '../../utils/image';
import { IconImage } from '../../components/icons';
import { TeacherHeader } from './TeacherHeader';
import './teacher.css';

const STATUS = {
  korrigiert: ['Korrigiert', '#DCEFE2', '#1E5E37'],
  abgegeben: ['Abgegeben', '#DDE7F7', '#1F4E8C'],
  offen: ['Offen', '#F1ECE7', '#5E4C47'],
  nichtgemacht: ['Nicht gemacht', '#FBE1DE', '#9B2A22'],
} as const;

const kindText = (h: Homework) => {
  const n = h.tasks.length;
  if (h.kind === 'compare') return `${n} Vergleiche`;
  if (h.kind === 'transform') return `${n} Verben umformen`;
  if (h.subject === 'franz') return `${n} Wörter übersetzen`;
  return `${n} Fragen`;
};

export function Lehrerin() {
  const data = useStore((s) => s.data);
  const apply = useStore((s) => s.apply);
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const current = data.homeworks.filter((h) => h.dueWeekOffset >= 0).sort((a, b) => a.dueWeekOffset - b.dueWeekOffset || a.dueWeekday - b.dueWeekday);
  const past = data.homeworks.filter((h) => h.dueWeekOffset < 0);
  const withSubmitted = current.find((h) => data.submissions.some((s) => s.homeworkId === h.id && s.status === 'abgegeben'));
  const [selId, setSelId] = useState<string>((location.state as { select?: string } | null)?.select ?? withSubmitted?.id ?? current[0]?.id ?? past[0]?.id);
  const [err, setErr] = useState('');
  const sel = data.homeworks.find((h) => h.id === selId) ?? current[0];
  const s = data.settings;
  const subs = data.submissions.filter((x) => x.homeworkId === sel?.id);
  const kids = [...data.students].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const done = subs.filter((x) => x.status === 'abgegeben' || x.status === 'korrigiert').length;

  const safe = (fn: Parameters<typeof apply>[0]) => {
    try { setErr(''); apply((d) => fn(d)); } catch (e) { if (e instanceof RuleError) setErr(e.message); else throw e; }
  };

  const hwCard = (h: Homework) => {
    const m = SUBJECTS[h.subject];
    const on = h.id === sel?.id;
    return (
      <li key={h.id}>
        <button type="button" className="t-hw" aria-pressed={on} onClick={() => setSelId(h.id)}
          style={{ background: m.light, borderColor: on ? m.dark : h.important && h.dueWeekOffset >= 0 ? 'var(--danger)' : 'transparent' }}>
          <span className="t-hw-tags">
            <span style={{ color: m.text }}>{m.label.toUpperCase()}</span>
            {h.important && <span className="tag-important">WICHTIG</span>}
          </span>
          <span className="t-hw-title">{h.title}</span>
          <span className="t-hw-sub">{kindText(h)} · Abgabe {h.dueWeekOffset === 1 ? 'nächsten ' : h.dueWeekOffset === -1 ? 'letzten ' : ''}{WEEKDAYS[h.dueWeekday]}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="app">
      <TeacherHeader />
      <main className="t-dash">
        {flash && <div className="msg-ok t-flash" role="status">{flash}</div>}
        <section className="t-card t-col-hw" aria-labelledby="t-hw-h">
          <h2 id="t-hw-h">Hausaufgaben</h2>
          <div className="t-muted">Diese Woche verteilt</div>
          <ul className="t-hw-list">{current.map(hwCard)}</ul>
          {past.length > 0 && <><div className="t-muted">Letzte Woche</div><ul className="t-hw-list">{past.map(hwCard)}</ul></>}
          <div style={{ flexGrow: 1 }} />
          <Link to="/lehrerin/neu" className="t-primary">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Neue Hausaufgabe erstellen
          </Link>
        </section>

        <section className="t-card t-col-subs" aria-labelledby="t-subs-h">
          <div className="t-subs-head">
            <h2 id="t-subs-h">Abgaben &amp; Spielgeld</h2>
            {sel && <span className="t-subs-hw" style={{ background: SUBJECTS[sel.subject].light, color: SUBJECTS[sel.subject].text }}>{SUBJECTS[sel.subject].label} · {sel.title}</span>}
          </div>
          <div className="t-muted">{done} von {kids.length} Kindern haben abgegeben</div>
          <div aria-live="polite">{err && <div className="msg-error">{err}</div>}</div>
          <ul className="t-kids">
            {kids.map((k) => {
              const sub = subs.find((x) => x.studentId === k.id);
              const st = sub ? STATUS[sub.status] : null;
              const debt = k.coins < 0;
              return (
                <li key={k.id} className="t-kid">
                  <div className="t-kid-top">
                    <div className="t-kid-avatar">{k.photo ? <img src={k.photo} alt="" /> : k.name[0]}</div>
                    <div className="t-kid-name">
                      <div>{k.name}{k.isNew && <span className="tag-new">NEU</span>}</div>
                      <div className="t-kid-forgot">Diesen Monat vergessen: {k.forgottenThisMonth}×</div>
                    </div>
                    <span className="t-money" style={debt ? { background: 'var(--danger-dark)', color: '#FFFFFF' } : undefined}>
                      {debt ? `${k.coins} Schulden` : `${k.coins} Spielgeld`}
                    </span>
                    {st && <span className="t-status" style={{ background: st[1], color: st[2] }}>{st[0]}</span>}
                  </div>
                  <div className="t-kid-actions">
                    {sub && (sub.status === 'abgegeben' || sub.status === 'korrigiert') && (
                      <Link to={`/lehrerin/korrigieren/${sel.id}?kind=${k.id}`} className={sub.status === 'abgegeben' ? 't-act strong' : 't-act'}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                        {sub.status === 'abgegeben' ? 'Antworten ansehen & korrigieren' : 'Antworten ansehen'}
                      </Link>
                    )}
                    {sub?.status === 'korrigiert' && <span className="t-note">{sub.grading?.every(Boolean) ? `Fehlerfrei +${sub.reward}` : `+${sub.reward} Spielgeld`}</span>}
                    {sub?.status === 'offen' && (
                      <button type="button" className="t-act danger" onClick={() => {
                        if (window.confirm(`${k.name}: Hausaufgabe als «nicht gemacht» markieren? Das nächste Spiel wird gestrichen.`)) safe((d) => markNotDone(d, sub.id));
                      }}>Nicht gemacht</button>
                    )}
                    {k.skipNextGame && <span className="t-flag">Nächstes Mal kein Spiel</span>}
                    {k.lockedUntilPositive && k.coins <= 0 && <span className="t-flag dark">Gesperrt bis mehr als 0 Spielgeld</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div style={{ flexGrow: 1 }} />
          <div className="t-rules">
            <b>Regeln:</b> Fehlerfrei = doppeltes Spielgeld · Nicht gemacht = beim nächsten Mal kein Spiel · 2× im Monat vergessen = Spielgeld-Schulden · Mit Schulden erst wieder spielen ab mehr als 0 · Die Lehrerin kann Spielgeld nicht löschen.
          </div>
        </section>

        <section className="t-card t-col-set" aria-labelledby="t-set-h">
          <h2 id="t-set-h">Belohnungen</h2>
          <div className="t-label">Spielgeld pro Abgabe <span>(in 10er-Schritten)</span></div>
          <div className="t-stepper-row">
            <div role="group" aria-label="Spielgeld pro Abgabe" className="t-stepper">
              <button type="button" aria-label="10 Spielgeld weniger" disabled={s.coinsPerSubmission <= 0} onClick={() => safe((d) => changeCoinsPerSubmission(d, -10))}>−10</button>
              <output aria-live="polite">{s.coinsPerSubmission}</output>
              <button type="button" aria-label="10 Spielgeld mehr" onClick={() => safe((d) => changeCoinsPerSubmission(d, 10))}>+10</button>
            </div>
            <span className="t-muted">Fehlerfrei: <b>{s.coinsPerSubmission * 2}</b></span>
          </div>
          <div className="t-label">Erlaubte Spiele</div>
          <div className="t-checks two">
            {(Object.keys(GAMES) as GameId[]).map((g) => (
              <label key={g}><input type="checkbox" checked={s.allowedGames.includes(g)} onChange={() => safe((d) => toggleGame(d, g))} />{GAMES[g].name}</label>
            ))}
          </div>
          <label htmlFor="zeit" className="t-label t-label-row">Spielzeit pro Abgabe <span className="t-badge">{s.maxMinutes} Min.</span></label>
          <input id="zeit" type="range" min={5} max={30} step={5} value={s.maxMinutes} onChange={(e) => safe((d) => setMaxMinutes(d, Number(e.target.value)))} className="t-range" />
          <div className="t-muted small">Höchstens 30 Minuten · 1 Spiel pro Abgabe</div>
          <div className="t-label">Hausi-Chat (Sicherheit)</div>
          <div className="t-checks">
            <label><input type="checkbox" checked disabled />Hausi verrät nie Lösungen (immer an)</label>
            <label><input type="checkbox" checked={s.hausiTeacherCanRead} onChange={(e) => safe((d) => setSetting(d, 'hausiTeacherCanRead', e.target.checked))} />Ich kann die Fragen an Hausi lesen</label>
            <label><input type="checkbox" checked={s.hausiSchoolTopicsOnly} onChange={(e) => safe((d) => setSetting(d, 'hausiSchoolTopicsOnly', e.target.checked))} />Hausi nur zu Schulthemen</label>
          </div>
          <div className="t-label">Startseite gestalten</div>
          <div className="t-upload">
            <input id="startbild" type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) { const url = await resizeImage(f, 1024); safe((d) => setSetting(d, 'startImage', url)); }
              e.target.value = '';
            }} />
            {s.startImage ? (
              <>
                <img src={s.startImage} alt="Bild für die Startseite" />
                <div className="t-upload-row">
                  <span className="t-ok">Ist jetzt auf der Startseite</span>
                  <label htmlFor="startbild" className="t-link">Ändern</label>
                  <button type="button" className="t-link" onClick={() => safe((d) => setSetting(d, 'startImage', undefined))}>Entfernen</button>
                </div>
              </>
            ) : (
              <>
                <IconImage size={34} />
                <label htmlFor="startbild" className="t-upload-btn">Bild hochladen</label>
                <div className="t-muted small">Erscheint auf der Startseite der Kinder</div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
