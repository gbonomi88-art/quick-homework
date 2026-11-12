import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { act, logout as doLogout } from '../store/actions';
import { reminders } from '../store/selectors';
import { CLASS_NAME } from '../store/constants';
import { AccountPopover } from './AccountPopover';
import { Dialog, CloseButton } from './Dialog';
import { IconBell, IconChat } from './icons';

const NOTIF_STYLE = {
  korrigiert: { bg: '#DCEFE2', fg: '#1E5E37' },
  heute: { bg: '#F1ECE7', fg: '#5E4C47' },
  morgen: { bg: '#FDE2DF', fg: '#B03A2E' },
};

/** Header der Kinder-Übersicht: Hausi fragen, Glocke, Konto. */
export function StudentHeader({ studentId }: { studentId: string }) {
  const data = useStore((s) => s.data);
  const nav = useNavigate();
  const [open, setOpen] = useState<'menu' | 'notif' | null>(null);
  const student = data.students.find((s) => s.id === studentId)!;
  const list = reminders(data, studentId);
  const firstOpen = data.submissions.find((s) => s.studentId === studentId && s.status === 'offen' &&
    data.homeworks.find((h) => h.id === s.homeworkId)?.dueWeekOffset === 0);

  return (
    <header className="app-header">
      <div className="app-title">Quick Homework</div>
      <div className="header-actions">
        <Link to={firstOpen ? `/kind/aufgabe/${firstOpen.homeworkId}?chat=1` : '/kind'} className="pill-accent" aria-label="Hausi fragen">
          <IconChat size={20} /><span className="pill-text">Hausi fragen</span>
        </Link>
        <button type="button" className="icon-btn" aria-label={`Erinnerungen, ${list.length} neu`} aria-expanded={open === 'notif'}
          onClick={() => setOpen(open === 'notif' ? null : 'notif')}>
          <IconBell size={22} />
          {list.length > 0 && <span aria-hidden="true" className="badge-count">{list.length}</span>}
        </button>
        <button type="button" className="avatar-btn" aria-label="Mein Konto" aria-expanded={open === 'menu'} onClick={() => setOpen(open === 'menu' ? null : 'menu')}>
          {student.photo ? <img src={student.photo} alt="" /> : student.name[0]}
        </button>
      </div>
      {open === 'menu' && (
        <AccountPopover name={student.name} subtitle={`Klasse ${CLASS_NAME}`} photo={student.photo} password={student.password} coins={student.coins}
          onPhoto={(photo) => act.setPhoto({ role: 'kid', id: studentId }, photo)}
          onChangePassword={(o, n) => act.changePassword({ role: 'kid', id: studentId }, o, n)}
          onLogout={() => { doLogout(); nav('/'); }} onClose={() => setOpen(null)} />
      )}
      {open === 'notif' && (
        <Dialog label="Erinnerungen" onClose={() => setOpen(null)} className="popover-notif" backdropLabel="Erinnerungen schliessen">
          <div className="notif-head">
            <span className="notif-title">Erinnerungen</span>
            <CloseButton onClick={() => setOpen(null)} />
          </div>
          {list.length === 0 && <div className="notif-empty">Keine neuen Erinnerungen. Alles erledigt!</div>}
          {list.map((r, i) => (
            <Link key={i} to={r.to} className="notif-item" style={{ background: NOTIF_STYLE[r.kind].bg }} onClick={() => setOpen(null)}>
              <span className="notif-label" style={{ color: NOTIF_STYLE[r.kind].fg }}>{r.label}</span>
              <span className="notif-text">{r.text} ›</span>
            </Link>
          ))}
        </Dialog>
      )}
    </header>
  );
}

/** Einfacher Unterseiten-Header: Zurück + Titel + optionaler rechter Bereich. */
export function SubHeader({ back = '/kind', backLabel = 'Übersicht', title, right }: { back?: string; backLabel?: string; title?: string; right?: React.ReactNode }) {
  return (
    <header className="app-header">
      <Link to={back} className="header-back">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        {backLabel}
      </Link>
      {title && <div className="header-center">{title}</div>}
      <div className="header-actions">{right ?? <span style={{ width: 44 }} />}</div>
    </header>
  );
}
