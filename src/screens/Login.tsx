import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkLogin, useStore, type Mode } from '../store/useStore';
import { loginClass, errorText } from '../store/actions';
import { InstallButton } from '../components/pwa';
import { TEACHER_TITLE } from '../store/constants';
import './Login.css';

export function Login() {
  const [role, setRole] = useState<'kid' | 'teacher'>('kid');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState('');
  const data = useStore((s) => s.data);
  const storeMode = useStore((s) => s.mode);
  const demoData = useStore((s) => (s.mode === 'demo' ? s.data : s.demoBackup)) ?? data;
  const login = useStore((s) => s.login);
  const leaveClass = useStore((s) => s.leaveClass);
  const [where, setWhere] = useState<Mode>(storeMode);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const teacher = role === 'teacher';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (where === 'klasse') {
      setBusy(true);
      try {
        const r = await loginClass(role, name, pw, remember);
        if (r === 'ok') { nav(role === 'teacher' ? '/lehrerin' : '/kind'); return; }
        setError(r === 'rolle'
          ? (teacher ? 'Dieses Konto gehört einem Kind. Bitte oben «Schüler/in» wählen.' : 'Dieses Konto gehört der Lehrerin. Bitte oben «Lehrerin» wählen.')
          : teacher ? 'Name oder Passwort stimmt nicht. Bitte versuchen Sie es nochmal.' : 'Hoppla! Name oder Passwort stimmt nicht. Versuch es nochmal.');
      } catch (err) { setError(errorText(err)); }
      setBusy(false);
      return;
    }
    if (storeMode === 'klasse') leaveClass();
    const session = checkLogin(demoData, role, name, pw);
    if (!session) {
      setError(teacher
        ? 'Name oder Passwort stimmt nicht. Bitte versuchen Sie es nochmal.'
        : 'Hoppla! Name oder Passwort stimmt nicht. Versuch es nochmal.');
      return;
    }
    login(session, remember);
    nav(session.role === 'teacher' ? '/lehrerin' : '/kind');
  };
  const pick = (r: 'kid' | 'teacher') => { setRole(r); setError(''); setForgot(false); };

  return (
    <div className="login">
      <div className="login-intro">
        <div className="login-logo">
          <svg aria-hidden="true" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4A2424" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2" /><path d="M9 8l2 2 4-4" /></svg>
        </div>
        <h1>Quick<br />Homework</h1>
        <p>Hausaufgaben machen, abgeben – und dann gibt es eine Belohnung.</p>
        <InstallButton />
      </div>
      <form className="login-card" onSubmit={submit} noValidate>
        <h2>Anmelden</h2>
        <div role="group" aria-label="Wo möchtest du arbeiten?" className="login-where">
          <button type="button" aria-pressed={where === 'klasse'} onClick={() => { setWhere('klasse'); setError(''); }}>
            <b>Klasse {'6c'}</b><span>online · alle Geräte</span>
          </button>
          <button type="button" aria-pressed={where === 'demo'} onClick={() => { setWhere('demo'); setError(''); }}>
            <b>Demo</b><span>nur dieses Gerät</span>
          </button>
        </div>
        <div role="group" aria-label="Ich bin" className="login-roles">
          <button type="button" aria-pressed={!teacher} onClick={() => pick('kid')}>Schüler/in</button>
          <button type="button" aria-pressed={teacher} onClick={() => pick('teacher')}>Lehrerin</button>
        </div>
        <div className="login-field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" autoComplete="username" autoCapitalize="words" placeholder={teacher ? 'z. B. Brunner' : 'Dein Name'}
            value={name} onChange={(e) => { setName(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby="login-error" />
        </div>
        <div className="login-field">
          <label htmlFor="pw">Passwort</label>
          <input id="pw" type="password" autoComplete="current-password" placeholder="••••••"
            value={pw} onChange={(e) => { setPw(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby="login-error" />
        </div>
        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Passwort auf diesem Gerät merken
        </label>
        <div id="login-error" aria-live="assertive" className={error ? 'login-error' : 'sr-only'}>{error}</div>
        <button type="submit" className="login-submit" disabled={busy}>
          {busy ? 'Einen Moment …' : 'Einloggen'}
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
        </button>
        <button type="button" className="login-forgot" aria-expanded={forgot} onClick={() => setForgot(!forgot)}>Passwort vergessen?</button>
        {forgot && (
          <div role="status" className="login-forgot-text">
            {teacher
              ? 'Kein Problem: Wir schicken Ihnen eine E-Mail mit einem Link für ein neues Passwort.'
              : `Kein Problem! Sag es ${TEACHER_TITLE}. Sie macht dir unter «Schüler verwalten» ein neues Passwort.`}
          </div>
        )}
        <p className="login-demo">{teacher ? 'Demo: Brunner / Tafel2026' : 'Demo: Mattia / Sonne2026'}{where === 'klasse' && ' (gilt auch für Klasse 6c)'}</p>
      </form>
    </div>
  );
}
