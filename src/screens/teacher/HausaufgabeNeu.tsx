import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { createHomework, validateHomework, weekForWeekday, RuleError } from '../../store/rules';
import { CLASS_NAME, WEEKDAYS } from '../../store/constants';
import type { SubjectId, Task, TaskKind, Weekday } from '../../store/types';
import { SUBJECTS, SUBJECT_ORDER, TASK_COLORS } from '../../data/subjects';
import { HausiHead } from '../../components/Hausi';
import { IconX } from '../../components/icons';
import { TeacherSubHeader } from './TeacherHeader';
import './teacher.css';

const TYPES: { id: TaskKind; label: string; example: string }[] = [
  { id: 'compare', label: 'Vergleichen', example: '½ ☐ 0,5 → <, > oder =' },
  { id: 'question', label: 'Fragen beantworten', example: 'Frage → eigene Antwort' },
  { id: 'transform', label: 'Wörter umformen', example: 'ich gehe → ich ging' },
];
const empty = (k: TaskKind): Task =>
  k === 'compare' ? { kind: 'compare', left: '', right: '', solution: '=' } : k === 'question' ? { kind: 'question', question: '', sampleSolution: '' } : { kind: 'transform', word: '', prefix: '', solution: '' };

export function HausaufgabeNeu() {
  const apply = useStore((s) => s.apply);
  const nav = useNavigate();
  const [subject, setSubject] = useState<SubjectId>('mathe');
  const [due, setDue] = useState<Weekday>(4);
  const [important, setImportant] = useState(false);
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [kind, setKind] = useState<TaskKind>('question');
  const [tasks, setTasks] = useState<Task[]>([empty('question'), empty('question')]);
  const [tip, setTip] = useState('');
  const [error, setError] = useState('');
  const m = SUBJECTS[subject];
  const week = weekForWeekday(due);

  const setTask = (i: number, patch: Partial<Task>) => setTasks(tasks.map((t, j) => (j === i ? ({ ...t, ...patch } as Task) : t)));
  const changeKind = (k: TaskKind) => { setKind(k); setTasks(tasks.map(() => empty(k))); };
  const draft = () => ({
    subject, title: title.trim(), instruction: instruction.trim(), dueWeekday: due, important, kind,
    tasks: tasks.map((t) => (t.kind === 'question' && !t.sampleSolution?.trim() ? { kind: 'question' as const, question: t.question } : t)),
    hausiTip: tip.trim() || undefined,
  });
  const submit = () => {
    const d = draft();
    const err = validateHomework(d);
    if (err) { setError(err); return; }
    try {
      apply((x) => createHomework(x, d));
      nav('/lehrerin', { state: { flash: `«${d.title}» wurde an die Klasse ${CLASS_NAME} verteilt.` } });
    } catch (e) { if (e instanceof RuleError) setError(e.message); else throw e; }
  };

  const previewText = (t: Task) =>
    t.kind === 'compare' ? `${t.left || '…'}   ☐   ${t.right || '…'}` : t.kind === 'question' ? t.question || 'Frage …' : `${t.word || '…'}  →  ${t.prefix}`;

  return (
    <div className="app">
      <TeacherSubHeader title="Neue Hausaufgabe erstellen" />
      <main className="t-editor">
        <form className="t-card" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <div className="t-step">
            <h2 className="t-step-title">1. Fach</h2>
            <div className="t-subjects" role="group" aria-label="Fach">
              {SUBJECT_ORDER.map((id) => {
                const s = SUBJECTS[id];
                const on = id === subject;
                return <button key={id} type="button" aria-pressed={on} onClick={() => setSubject(id)}
                  style={{ borderColor: s.dark, background: on ? s.dark : s.light, color: on ? '#FFFFFF' : s.text }}>{s.label}</button>;
              })}
            </div>
            <div className="t-row">
              <label className="t-field" style={{ flex: '1 1 200px' }}>Abgabe am
                <select value={due} onChange={(e) => setDue(Number(e.target.value) as Weekday)}>
                  {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}{weekForWeekday(i) === 1 ? ' (nächste Woche)' : ''}</option>)}
                </select>
              </label>
              <label className="t-important"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />Wichtig</label>
            </div>
          </div>
          <div className="t-step">
            <h2 className="t-step-title">2. Titel</h2>
            <label className="t-field">Titel<input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder="z. B. Malrechnungen bis 100" /></label>
            <label className="t-field">Anleitung für die Kinder<textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="z. B. Rechne aus und schreib das Ergebnis hin." /></label>
          </div>
          <div className="t-step">
            <h2 className="t-step-title">3. Art der Aufgaben</h2>
            <div className="t-types" role="group" aria-label="Art der Aufgaben">
              {TYPES.map((ty) => <button key={ty.id} type="button" aria-pressed={kind === ty.id} onClick={() => changeKind(ty.id)}><b>{ty.label}</b><span>{ty.example}</span></button>)}
            </div>
          </div>
          <div className="t-step">
            <h2 className="t-step-title">4. Aufgaben</h2>
            <div className="t-muted">Die Lösung sehen nur Sie – damit prüft die App, ob alles richtig ist.</div>
            {tasks.map((t, i) => (
              <div key={i} className={`t-task-row ${t.kind}`}>
                <span className="t-task-num" aria-hidden="true">{i + 1}</span>
                {t.kind === 'compare' && <>
                  <label className="t-field">Links<input value={t.left} aria-label={`Aufgabe ${i + 1} links`} placeholder="3/4" onChange={(e) => setTask(i, { left: e.target.value })} /></label>
                  <div className="t-field t-sol"><span id={`sol-${i}`}>Lösung</span>
                    <div className="t-signs" role="group" aria-labelledby={`sol-${i}`}>
                      {(['<', '>', '='] as const).map((s) => <button key={s} type="button" aria-pressed={t.solution === s} aria-label={`Aufgabe ${i + 1} Lösung ${s}`} onClick={() => setTask(i, { solution: s })}>{s}</button>)}
                    </div>
                  </div>
                  <label className="t-field">Rechts<input value={t.right} aria-label={`Aufgabe ${i + 1} rechts`} placeholder="0,7" onChange={(e) => setTask(i, { right: e.target.value })} /></label>
                </>}
                {t.kind === 'question' && <>
                  <label className="t-field">Frage<input value={t.question} aria-label={`Frage ${i + 1}`} onChange={(e) => setTask(i, { question: e.target.value })} /></label>
                  <label className="t-field t-sol">Musterlösung (freiwillig)<input value={t.sampleSolution ?? ''} aria-label={`Musterlösung ${i + 1}`} onChange={(e) => setTask(i, { sampleSolution: e.target.value })} /></label>
                </>}
                {t.kind === 'transform' && <>
                  <label className="t-field">Wort / Satz<input value={t.word} aria-label={`Aufgabe ${i + 1} Wort`} placeholder="ich gehe" onChange={(e) => setTask(i, { word: e.target.value })} /></label>
                  <label className="t-field">Anfang<input value={t.prefix} aria-label={`Aufgabe ${i + 1} Anfang`} placeholder="ich" onChange={(e) => setTask(i, { prefix: e.target.value })} /></label>
                  <label className="t-field t-sol">Lösung<input value={t.solution} aria-label={`Aufgabe ${i + 1} Lösung`} placeholder="ging" onChange={(e) => setTask(i, { solution: e.target.value })} /></label>
                </>}
                <button type="button" className="t-del" aria-label={`Aufgabe ${i + 1} löschen`} disabled={tasks.length === 1} onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><IconX size={18} /></button>
              </div>
            ))}
            {tasks.length < 8 && <button type="button" className="t-add" onClick={() => setTasks([...tasks, empty(kind)])}>+ Aufgabe hinzufügen</button>}
          </div>
          <div className="t-step">
            <h2 className="t-step-title">5. Tipp für Hausi (freiwillig)</h2>
            <label className="t-field">Tipp – ohne die Lösung zu verraten<textarea value={tip} onChange={(e) => setTip(e.target.value)} placeholder="z. B. Denk an die 10er-Reihe." /></label>
          </div>
          <div aria-live="assertive">{error && <div className="msg-error">{error}</div>}</div>
          <div className="t-actions">
            <button type="button" className="t-secondary" onClick={() => nav('/lehrerin')}>Abbrechen</button>
            <button type="submit" className="t-primary">An Klasse {CLASS_NAME} verteilen</button>
          </div>
        </form>
        <aside className="t-preview" aria-label="Vorschau">
          <div className="t-preview-label">SO SEHEN ES DIE KINDER</div>
          <div className="t-preview-box">
            <div className="t-preview-head" style={{ background: m.light }}>
              <div className="meta">
                <b style={{ color: m.text }}>{m.label.toUpperCase()}</b>
                <span style={{ color: m.muted }}>· Abgabe: {week === 1 ? 'nächsten ' : ''}{WEEKDAYS[due]}</span>
                {important && <span className="tag-important">WICHTIG</span>}
              </div>
              <h3 style={{ color: m.title }}>{title || 'Titel der Hausaufgabe'}</h3>
              <p style={{ color: m.muted }}>{instruction || 'Anleitung für die Kinder'}</p>
            </div>
            <div className="t-preview-tasks">
              {tasks.map((t, i) => (
                <div key={i} className="t-preview-task" style={{ background: TASK_COLORS[i % 4][0] }}>
                  <span className="t-preview-num" style={{ background: TASK_COLORS[i % 4][1] }}>{i + 1}</span>{previewText(t)}
                </div>
              ))}
            </div>
            {tip.trim() && <div className="t-preview-tip"><HausiHead size={26} /><span><b>Hausi-Tipp:</b> {tip}</span></div>}
          </div>
        </aside>
      </main>
    </div>
  );
}
