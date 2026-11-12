import { useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { autoCheck } from '../../store/rules';
import { act, errorText } from '../../store/actions';
import type { Task } from '../../store/types';
import { SUBJECTS } from '../../data/subjects';
import { Coin } from '../../components/icons';
import { TeacherSubHeader } from './TeacherHeader';
import './teacher.css';

const taskLabel = (t: Task) => (t.kind === 'compare' ? `${t.left}  ☐  ${t.right}` : t.kind === 'transform' ? `${t.word} → ${t.prefix} …` : t.question);
const solution = (t: Task) => (t.kind === 'compare' ? t.solution : t.kind === 'transform' ? `${t.prefix} ${t.solution}` : t.sampleSolution ?? '');

export function Korrigieren() {
  const { homeworkId } = useParams();
  const [params, setParams] = useSearchParams();
  const data = useStore((s) => s.data);
  const hw = data.homeworks.find((h) => h.id === homeworkId);
  const kids = [...data.students].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const subs = data.submissions.filter((s) => s.homeworkId === homeworkId);
  const gradeable = (id: string) => ['abgegeben', 'korrigiert'].includes(subs.find((s) => s.studentId === id)?.status ?? '');
  const kidId = params.get('kind') && gradeable(params.get('kind')!) ? params.get('kind')! : kids.find((k) => gradeable(k.id))?.id;
  const kid = kids.find((k) => k.id === kidId);
  const sub = subs.find((s) => s.studentId === kidId);
  const auto = useMemo(() => (hw && sub ? hw.tasks.map((t, i) => autoCheck(t, sub.answers[i] ?? '')) : []), [hw, sub]);
  const [overrides, setOverrides] = useState<Record<string, (boolean | undefined)[]>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  if (!hw) return <Navigate to="/lehrerin" replace />;
  const m = SUBJECTS[hw.subject];
  const done = sub?.status === 'korrigiert';
  const grading: boolean[] = done ? sub!.grading! : hw.tasks.map((_, i) => overrides[kidId!]?.[i] ?? auto[i] ?? true);
  const comment = done ? sub!.comment ?? '' : comments[kidId!] ?? '';
  const right = grading.filter(Boolean).length;
  const perfect = right === hw.tasks.length;
  const base = sub?.baseReward ?? data.settings.coinsPerSubmission;
  const reward = done ? sub!.reward ?? base : perfect ? base * 2 : base;

  const set = (i: number, v: boolean) => setOverrides({ ...overrides, [kidId!]: hw.tasks.map((_, j) => (j === i ? v : overrides[kidId!]?.[j])) });
  const send = async () => {
    try {
      await act.grade(sub!.id, grading, comment.trim());
      setSent(`Korrektur an ${kid!.name} gesendet.`); setErr('');
    } catch (e) { setErr(errorText(e)); }
  };

  return (
    <div className="app">
      <TeacherSubHeader title={`Korrigieren · ${m.label}: ${hw.title}`} />
      <main className="t-grade">
        <div className="t-tabs" role="tablist" aria-label="Kinder">
          {kids.map((k) => {
            const s = subs.find((x) => x.studentId === k.id);
            const can = gradeable(k.id);
            return (
              <button key={k.id} type="button" role="tab" aria-selected={k.id === kidId} disabled={!can}
                title={can ? undefined : 'Noch nicht abgegeben'} onClick={() => { setParams({ kind: k.id }, { replace: true }); setSent(''); setErr(''); }}>
                <span className="dot" aria-hidden="true" style={{ background: s?.status === 'korrigiert' ? 'var(--success)' : s?.status === 'abgegeben' ? '#1F4E8C' : '#C9BBB2' }} />
                {k.name}
                <span className="sr-only">{s?.status === 'korrigiert' ? '(korrigiert)' : s?.status === 'abgegeben' ? '(abgegeben)' : '(noch nicht abgegeben)'}</span>
              </button>
            );
          })}
        </div>
        {!kid || !sub ? (
          <div className="t-card"><h2>Noch keine Abgaben</h2><div className="t-muted">Sobald ein Kind die Hausaufgabe abgibt, können Sie sie hier korrigieren.</div></div>
        ) : (
          <div className="t-grade-body" role="tabpanel">
            <section className="t-card">
              <h2>Antworten von {kid.name}</h2>
              <div className="t-muted">Die App prüft mit Ihrer Lösung vor – Sie können jede Aufgabe ändern.</div>
              <table className="t-table">
                <thead><tr><th>Aufgabe</th><th>Antwort Kind</th><th>Lösung</th><th>Bewertung</th></tr></thead>
                <tbody>
                  {hw.tasks.map((t, i) => (
                    <tr key={i}>
                      <td><span className="muted">{i + 1}. </span>{taskLabel(t)}</td>
                      <td>{sub.answers[i] || <span className="muted">–</span>}</td>
                      <td className="sol">{solution(t) || <span className="muted">freie Antwort</span>}</td>
                      <td>
                        <div className="t-judge" role="group" aria-label={`Bewertung Aufgabe ${i + 1}`}>
                          <button type="button" className="ok" aria-pressed={grading[i]} disabled={done} onClick={() => set(i, true)}>Richtig</button>
                          <button type="button" className="bad" aria-pressed={!grading[i]} disabled={done} onClick={() => set(i, false)}>Falsch</button>
                        </div>
                        {!done && auto[i] === undefined && overrides[kidId!]?.[i] === undefined && <span className="t-check-hint">Bitte prüfen</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <label className="t-field">Kommentar für {kid.name}
                <textarea value={comment} readOnly={done} onChange={(e) => setComments({ ...comments, [kidId!]: e.target.value })} placeholder="z. B. Toll gemacht! Schau dir Aufgabe 3 nochmal an." />
              </label>
            </section>
            <aside className="t-card">
              <div className="t-result">
                <div className="t-muted"><b>ERGEBNIS</b></div>
                <div className="score" style={{ color: perfect ? 'var(--success)' : 'var(--text)' }}>{right} / {hw.tasks.length}</div>
                <div className="t-muted">richtig</div>
                <div style={{ fontWeight: 900, color: perfect ? '#1E5E37' : 'var(--text-muted)' }}>{perfect ? 'Fehlerfrei – doppeltes Spielgeld!' : 'Mit Fehlern'}</div>
              </div>
              <div className="t-reward"><Coin size={30} /><div>{kid.name} {done ? 'hat bekommen' : 'bekommt'}<br /><b style={{ fontSize: 18 }}>+{reward} Spielgeld</b></div></div>
              <div aria-live="polite">
                {err && <div className="msg-error">{err}</div>}
                {(sent || done) && <div className="msg-ok">{sent || `Korrektur an ${kid.name} gesendet.`}</div>}
              </div>
              <button type="button" className="t-primary" disabled={done} onClick={send}>{done ? 'Gesendet' : 'Korrektur senden'}</button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
