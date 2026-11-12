import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { markSeen } from '../../store/rules';
import { TEACHER_TITLE } from '../../store/constants';
import type { Task } from '../../store/types';
import { SUBJECTS } from '../../data/subjects';
import { SubHeader } from '../../components/StudentHeader';
import { HausiHead } from '../../components/Hausi';
import { Fraction } from '../../components/TaskInput';
import { Coin, IconCheck, IconX, SubjectIcon } from '../../components/icons';
import { useKid } from './useKid';
import './Korrektur.css';

function Line({ task, answer, ok }: { task: Task; answer: string; ok: boolean }) {
  const a = <span className={ok ? 'k-ans ok' : 'k-ans bad'}>{answer || '–'}</span>;
  if (task.kind === 'compare') return <span className="k-expr k-compare"><Fraction v={task.left} /> {a} <Fraction v={task.right} /></span>;
  if (task.kind === 'transform') return <span className="k-expr">{task.word} → {task.prefix} {a}</span>;
  if (task.question.length <= 14) return <span className="k-expr">{task.question} = {a}</span>;
  return <span className="k-expr k-long"><span className="k-q">{task.question}</span>{a}</span>;
}

export function Korrektur() {
  const { id } = useParams();
  const { data, student } = useKid();
  const apply = useStore((s) => s.apply);
  const nav = useNavigate();
  const hw = data.homeworks.find((h) => h.id === id);
  const sub = data.submissions.find((s) => s.homeworkId === id && s.studentId === student.id);
  if (!hw || !sub || sub.status !== 'korrigiert' || !sub.grading) return <Navigate to="/kind" replace />;
  const m = SUBJECTS[hw.subject];
  const right = sub.grading.filter(Boolean).length;
  const perfect = right === hw.tasks.length;
  const base = sub.baseReward ?? data.settings.coinsPerSubmission;
  const week = hw.dueWeekOffset === -1 ? 'LETZTE WOCHE' : 'DIESE WOCHE';

  return (
    <div className="app">
      <SubHeader title="Meine Korrektur" />
      <main className="kor grid-bg">
        <section className="kor-main">
          <div className="kor-head" style={{ background: m.light }}>
            <div className="kor-head-icon" style={{ background: m.dark }}><SubjectIcon subject={hw.subject} size={30} /></div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div className="kor-meta" style={{ color: m.text }}>{m.label.toUpperCase()} · {week} · KORRIGIERT VON {TEACHER_TITLE.toUpperCase()}</div>
              <h1 style={{ color: m.title }}>{hw.title}</h1>
            </div>
            <div className="kor-score">
              <div className="kor-score-num" style={{ color: m.dark }}>{right} / {hw.tasks.length}</div>
              <div className="kor-score-label">richtig</div>
            </div>
          </div>
          <ul className="kor-list">
            {hw.tasks.map((t, i) => {
              const ok = sub.grading![i];
              return (
                <li key={i} className={`kor-item ${ok ? 'ok' : 'bad'}`}>
                  <span className="kor-mark" aria-hidden="true">{ok ? <IconCheck size={20} /> : <IconX size={18} />}</span>
                  <Line task={t} answer={sub.answers[i]} ok={ok} />
                  <span className="kor-verdict">{ok ? 'Richtig' : 'Nochmal versuchen'}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="kor-aside">
          {sub.comment && (
            <div className="kor-comment">
              <div className="kor-comment-head">
                <div className="kor-teacher">{data.teacher.photo ? <img src={data.teacher.photo} alt="" /> : TEACHER_TITLE.split(' ')[1][0]}</div>
                <div className="kor-says">{TEACHER_TITLE} schreibt:</div>
              </div>
              <div className="kor-bubble">{sub.comment}</div>
            </div>
          )}
          <div className="kor-coins">
            <Coin size={34} />
            <div><b>+{sub.reward ?? base} Spielgeld</b><br />{perfect ? 'Fehlerfrei – doppeltes Spielgeld!' : `Fehlerfrei hätte es +${base * 2} gegeben.`}</div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <Link to={`/kind/aufgabe/${hw.id}?chat=1`} className="kor-btn hausi"><HausiHead size={26} /> Mit Hausi üben</Link>
          <button type="button" className="kor-btn ok" onClick={() => { apply((d) => markSeen(d, sub.id)); nav('/kind'); }}>Verstanden</button>
        </aside>
      </main>
    </div>
  );
}
