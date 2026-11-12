import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { act, logout as doLogout } from '../../store/actions';
import { CLASS_NAME, TEACHER_TITLE } from '../../store/constants';
import { AccountPopover } from '../../components/AccountPopover';
import { IconBack, IconCalendar } from '../../components/icons';

const IconUsers = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6 6 0 0 1 3.5 6" />
  </svg>
);

/** Header Dashboard: Schüler verwalten, Agenda, Klasse, Konto. */
export function TeacherHeader() {
  const teacher = useStore((s) => s.data.teacher);
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  return (
    <header className="app-header t-header">
      <div className="app-title">Quick Homework <span className="t-role">· Lehrerin</span></div>
      <nav className="header-actions" aria-label="Lehrerin">
        <Link to="/lehrerin/schueler" className="pill-accent" aria-label="Schüler verwalten"><IconUsers /><span className="pill-text">Schüler verwalten</span></Link>
        <Link to="/lehrerin/agenda" className="t-pill" aria-label="Agenda"><IconCalendar size={20} /><span className="pill-text">Agenda</span></Link>
        <div className="t-class">Klasse {CLASS_NAME}</div>
        <button type="button" className="t-account" aria-label={`Konto von ${TEACHER_TITLE}`} aria-expanded={menu} onClick={() => setMenu(!menu)}>
          <span className="t-account-img">{teacher.photo ? <img src={teacher.photo} alt="" /> : TEACHER_TITLE.split(' ')[1][0]}</span>
          <span className="pill-text">{TEACHER_TITLE}</span>
        </button>
      </nav>
      {menu && (
        <AccountPopover name={TEACHER_TITLE} subtitle={`Lehrerin · Klasse ${CLASS_NAME}`} photo={teacher.photo} password={teacher.password}
          onPhoto={(photo) => act.setPhoto({ role: 'teacher' }, photo)}
          onChangePassword={(o, n) => act.changePassword({ role: 'teacher' }, o, n)}
          onLogout={() => { doLogout(); nav('/'); }} onClose={() => setMenu(false)} />
      )}
    </header>
  );
}

/** Header Unterseiten: Zurück + Titel + „Frau Brunner · Klasse 6c“. */
export function TeacherSubHeader({ title }: { title: string }) {
  return (
    <header className="app-header t-header">
      <Link to="/lehrerin" className="header-back"><IconBack size={22} />Zurück</Link>
      <h1 className="t-sub-title">{title}</h1>
      <div className="t-sub-who">{TEACHER_TITLE} · Klasse {CLASS_NAME}</div>
    </header>
  );
}
