import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { act, errorText } from '../../store/actions';
import { WEEKDAYS } from '../../store/constants';
import { SUBJECTS, TASK_COLORS } from '../../data/subjects';
import { SubHeader } from '../../components/StudentHeader';
import { HausiChat } from '../../components/HausiChat';
import { TaskInput } from '../../components/TaskInput';
import { Coin, IconChat, IconCheck, SubjectIcon } from '../../components/icons';
import { useMedia } from '../../utils/useMedia';
import { useKid } from './useKid';
import './Aufgabe.css';

export function Aufgabe() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, student } = useKid();
  const nav = useNavigate();
  const wide = useMedia('(min-width: 900px)');
  const [chat, setChat] = useState<boolean>(() => params.get('chat') === '1' || window.matchMedia('(min-width: 900px)').matches);
  const [focus, setFocus] = useState(0);
  const [error, setError] = useState('');
  const hw = data.homeworks.find((h) => h.id === id);
  const sub = data.submissions.find((s) => s.homeworkId === id && s.studentId === student.id);
  useEffect(() => { if (!wide && params.get('chat') !== '1') setChat(false); }, [wide, params]);
  if (!hw || !sub) return <Navigate to="/kind" replace />;

  const m = SUBJECTS[hw.subject];
  const readOnly = sub.status !== 'offen';
  const answers = hw.tasks.map((_, i) => sub.answers[i] ?? '');
  const done = answers.filter((a) => a.trim() !== '').length;
  const all = done === hw.tasks.length;
  const praiseIdx = Math.min(4, Math.round((done / hw.tasks.length) * 4));
  const amount = data.settings.coinsPerSubmission;

  const setAnswer = (i: number, v: string) => {
    const next = answers.slice(); next[i] = v;
    act.saveDraft(sub.id, next);
    setError('');
  };
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!all) { setError('Fülle zuerst alle Aufgaben aus. Dann kannst du abgeben.'); return; }
    setBusy(true);
    try { await act.submit(sub.id, answers); nav(`/kind/belohnung/${sub.id}`); }
    catch (e) { setError(errorText(e)); setBusy(false); }
  };

  return (
    <div className="app aufgabe-app">
      <SubHeader right={
        <button type="button" className="pill-accent" aria-label={chat ? 'Chat schliessen' : 'Hausi fragen'} aria-expanded={chat} onClick={() => setChat(!chat)}>
          <IconChat size={20} /><span className="pill-text">{chat ? 'Chat schliessen' : 'Hausi fragen'}</span>
        </button>
      } />
      <div className="auf-wrap">
        <main className="auf grid-bg">
          <div className="auf-head" style={{ background: m.light }}>
            <div className="auf-head-icon" style={{ background: m.dark }}><SubjectIcon subject={hw.subject} size={34} /></div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="auf-head-meta">
                <span style={{ color: m.text, fontWeight: 900 }}>{m.label.toUpperCase()}</span>
                <span style={{ color: m.muted }}>· Abgabe: {hw.dueWeekOffset === -1 ? 'letzten ' : hw.dueWeekOffset === 1 ? 'nächsten ' : ''}{WEEKDAYS[hw.dueWeekday]}</span>
                {hw.important && <span className="tag-important">WICHTIG</span>}
              </div>
              <h1 style={{ color: m.title }}>{hw.title}</h1>
              <p style={{ color: m.muted }}>{hw.instruction}</p>
            </div>
          </div>

          {readOnly ? (
            <div className="auf-done" role="status">
              {sub.status === 'nichtgemacht' ? 'Diese Hausaufgabe wurde als «nicht gemacht» markiert.' :
                sub.status === 'korrigiert' ? <>Schon korrigiert. <Link to={`/kind/korrektur/${hw.id}`}>Korrektur ansehen ›</Link> Du kannst hier mit Hausi üben.</> :
                  'Schon abgegeben – super! Die Lehrerin korrigiert sie bald. Du kannst hier mit Hausi üben.'}
            </div>
          ) : (
            <div className="auf-progress">
              <span className="auf-progress-text">{done} von {hw.tasks.length} gelöst</span>
              <div className="bar big"><div style={{ width: `${(done / hw.tasks.length) * 100}%` }} /></div>
              <span aria-live="polite" className="auf-praise" lang={m.lang?.slice(0, 2)}
                style={all ? { background: 'var(--success)', color: '#FFFFFF' } : undefined}>{m.praise[praiseIdx]}</span>
            </div>
          )}

          <div className={`auf-tasks kind-${hw.kind}${hw.kind === 'question' && hw.subject !== 'franz' ? ' long' : ''}`}>
            {hw.tasks.map((t, i) => {
              const filled = answers[i].trim() !== '';
              const [bg, num] = TASK_COLORS[i % 4];
              const Card = hw.kind === 'compare' ? 'div' : 'label';
              return (
                <Card key={i} className="auf-task" style={{ background: bg, borderColor: filled ? 'var(--success)' : 'transparent' }}>
                  <span className="auf-num" style={{ background: filled ? 'var(--success)' : num }}>{i + 1}</span>
                  <TaskInput task={t} subject={hw.subject} index={i} value={answers[i]} readOnly={readOnly} onFocus={() => setFocus(i)} onChange={(v) => setAnswer(i, v)} />
                </Card>
              );
            })}
          </div>

          <div style={{ flexGrow: 1 }} />
          {!readOnly && (
            <div className="auf-foot">
              <div className="auf-coins">
                <Coin size={28} />
                <div><b>+{amount} Spielgeld</b> fürs Abgeben<br />Alles richtig? Dann <b>+{amount * 2}</b>!</div>
              </div>
              <div className="auf-submit-wrap">
                <div aria-live="assertive" className={error ? 'msg-error' : 'sr-only'}>{error}</div>
                <button type="button" className={`auf-submit${all ? ' ready' : ''}`} aria-disabled={!all || busy} disabled={busy} onClick={submit}>
                  <IconCheck size={22} /> Abgeben
                </button>
              </div>
            </div>
          )}
        </main>
        {chat && (
          <>
            {!wide && <button type="button" className="chat-backdrop" aria-label="Chat schliessen" tabIndex={-1} onClick={() => setChat(false)} />}
            <HausiChat hw={hw} student={student} focus={focus} onClose={() => setChat(false)} />
          </>
        )}
      </div>
    </div>
  );
}
