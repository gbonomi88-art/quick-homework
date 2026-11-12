import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { addStudent, updateStudent, RuleError } from '../../store/rules';
import { CLASS_NAME } from '../../store/constants';
import { TeacherSubHeader } from './TeacherHeader';
import './teacher.css';

const WORDS = ['Sonne', 'Mond', 'Wolke', 'Blitz', 'Stern', 'Regen', 'Wind', 'Berg', 'Fluss', 'Baum'];
const newPassword = () => WORDS[Math.floor(Math.random() * WORDS.length)] + (10 + Math.floor(Math.random() * 90));

export function SchuelerVerwalten() {
  const data = useStore((s) => s.data);
  const apply = useStore((s) => s.apply);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<{ id: string; name: string; password: string } | null>(null);
  const [editErr, setEditErr] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState(newPassword);
  const [addErr, setAddErr] = useState('');
  const [added, setAdded] = useState('');
  const list = [...data.students].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const save = () => {
    try { apply((d) => updateStudent(d, edit!.id, { name: edit!.name, password: edit!.password })); setEdit(null); setEditErr(''); }
    catch (e) { if (e instanceof RuleError) setEditErr(e.message); else throw e; }
  };
  const add = () => {
    try {
      apply((d) => addStudent(d, name, pw));
      setAdded(`${name.trim()} ist jetzt in der Klasse ${CLASS_NAME}.`); setName(''); setPw(newPassword()); setAddErr('');
    } catch (e) { if (e instanceof RuleError) setAddErr(e.message); else throw e; }
  };

  return (
    <div className="app">
      <TeacherSubHeader title="Schüler verwalten" />
      <main className="t-students">
        <section className="t-card" aria-labelledby="st-h">
          <div className="t-subs-head"><h2 id="st-h">Klasse {CLASS_NAME}</h2><span className="t-muted">{list.length} Schüler</span></div>
          {list.map((s) => (
            <div key={s.id} className="t-st">
              <div className="t-st-row">
                <div className="t-kid-avatar">{s.photo ? <img src={s.photo} alt="" /> : s.name[0]}</div>
                <div className="t-kid-name">
                  <div>{s.name}{s.isNew && <span className="tag-new">NEU</span>}</div>
                  <div className="t-st-pw">Passwort: {shown[s.id] ? s.password : '••••••'}</div>
                </div>
                <span className="t-money" style={s.coins < 0 ? { background: 'var(--danger-dark)', color: '#FFFFFF' } : undefined}>{s.coins} Spielgeld</span>
                <button type="button" className="t-act" aria-pressed={!!shown[s.id]} aria-label={`Passwort von ${s.name} ${shown[s.id] ? 'verbergen' : 'anzeigen'}`}
                  onClick={() => setShown({ ...shown, [s.id]: !shown[s.id] })}>{shown[s.id] ? 'Verbergen' : 'Anzeigen'}</button>
                <button type="button" className="t-act strong" aria-expanded={edit?.id === s.id} onClick={() => { setEdit({ id: s.id, name: s.name, password: s.password }); setEditErr(''); }}>Bearbeiten</button>
              </div>
              {edit?.id === s.id && (
                <div className="t-st-edit">
                  <div className="t-row">
                    <label className="t-field" style={{ flex: '1 1 160px' }}>Name<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
                    <label className="t-field" style={{ flex: '1 1 160px' }}>Passwort<input value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></label>
                    <button type="button" className="t-act" onClick={() => setEdit({ ...edit, password: newPassword() })}>Neues erstellen</button>
                  </div>
                  <div className="t-muted small">Spielgeld ({s.coins}) kann man hier nicht ändern.</div>
                  <div aria-live="assertive">{editErr && <div className="msg-error">{editErr}</div>}</div>
                  <div className="t-row" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="t-act" onClick={() => setEdit(null)}>Abbrechen</button>
                    <button type="button" className="t-act strong" onClick={save}>Speichern</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
        <aside className="t-card" aria-labelledby="add-h">
          <h2 id="add-h">Schüler hinzufügen</h2>
          <form onSubmit={(e) => { e.preventDefault(); add(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
            <label className="t-field">Name<input value={name} onChange={(e) => { setName(e.target.value); setAddErr(''); setAdded(''); }} autoComplete="off" /></label>
            <div className="t-row">
              <label className="t-field" style={{ flex: '1 1 140px' }}>Start-Passwort<input value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /></label>
              <button type="button" className="t-act" onClick={() => setPw(newPassword())}>Erstellen</button>
            </div>
            <div className="t-muted small">Neue Schüler starten mit 0 Spielgeld. Das Passwort kann das Kind später selbst ändern.</div>
            <div aria-live="polite">{addErr && <div className="msg-error">{addErr}</div>}{added && <div className="msg-ok">{added}</div>}</div>
            <button type="submit" className="t-primary">Zur Klasse hinzufügen</button>
          </form>
          <div className="t-info"><b>Gut zu wissen:</b> Die Lehrerin kann Namen und Passwörter ändern. Das Spielgeld bleibt aber immer beim Kind – es kann nicht gelöscht werden.</div>
        </aside>
      </main>
    </div>
  );
}
