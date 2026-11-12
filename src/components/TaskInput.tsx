import type { Task } from '../store/types';
import type { SubjectId } from '../store/types';

export function Fraction({ v }: { v: string }) {
  if (!v.includes('/')) return <span className="t-dec">{v}</span>;
  const [n, d] = v.split('/');
  return <span className="t-frac" aria-label={`${n} durch ${d}`}><span>{n}</span><span className="t-frac-d">{d}</span></span>;
}

interface Props { task: Task; subject: SubjectId; value: string; onChange: (v: string) => void; readOnly?: boolean; onFocus?: () => void; index: number }

/** Eingabe je nach Aufgabentyp: Vergleichen, Fragen, Umformen. */
export function TaskInput({ task, subject, value, onChange, readOnly, onFocus, index }: Props) {
  if (task.kind === 'compare') {
    const aria = `Aufgabe ${index + 1}: ${task.left.replace('/', ' durch ')} und ${task.right.replace('/', ' durch ')} vergleichen`;
    return (
      <span className="t-compare">
        <span className="t-compare-row">
          <Fraction v={task.left} />
          <input type="text" inputMode="none" maxLength={1} aria-label={aria} value={value} readOnly={readOnly} onFocus={onFocus}
            onChange={(e) => { const v = e.target.value.slice(-1); if (v === '' || '<>='.includes(v)) onChange(v); }} className="t-sign" />
          <Fraction v={task.right} />
        </span>
        {!readOnly && (
          <span className="t-sign-pick" role="group" aria-label={`Zeichen für Aufgabe ${index + 1} wählen`}>
            {(['<', '=', '>'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={value === s} onClick={() => { onFocus?.(); onChange(s); }}
                aria-label={s === '<' ? 'kleiner als' : s === '>' ? 'grösser als' : 'gleich'}>{s}</button>
            ))}
          </span>
        )}
      </span>
    );
  }
  if (task.kind === 'transform') {
    return (
      <span className="t-transform">
        <span className="t-word">{task.word}</span>
        <span className="t-transform-row">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
          {task.prefix}
          <input type="text" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label={`${task.word} in der Vergangenheit`} value={value} readOnly={readOnly}
            onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className="t-short" />
        </span>
      </span>
    );
  }
  if (subject === 'franz') {
    return (
      <span className="t-transform">
        <span className="t-word" lang="fr" style={{ fontStyle: 'italic' }}>{task.question}</span>
        <span className="t-transform-row">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
          <input type="text" aria-label={`${task.question} auf Deutsch`} placeholder="auf Deutsch" value={value} readOnly={readOnly}
            onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className="t-long" />
        </span>
      </span>
    );
  }
  return (
    <span className="t-question">
      <span className="t-q-text" lang={subject === 'englisch' ? 'en' : undefined}>{task.question}</span>
      <input type="text" aria-label={`Antwort zu Aufgabe ${index + 1}`} placeholder={task.placeholder ?? 'Deine Antwort…'} value={value} readOnly={readOnly}
        onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className="t-answer" lang={subject === 'englisch' ? 'en' : undefined} />
    </span>
  );
}
