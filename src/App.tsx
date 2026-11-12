import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Login } from './screens/Login';
import { Lehrerin } from './screens/teacher/Lehrerin';
import { HausaufgabeNeu } from './screens/teacher/HausaufgabeNeu';
import { Korrigieren } from './screens/teacher/Korrigieren';
import { SchuelerVerwalten } from './screens/teacher/SchuelerVerwalten';
import { AgendaLehrerin } from './screens/teacher/AgendaLehrerin';
import { Uebersicht } from './screens/student/Uebersicht';
import { Aufgabe } from './screens/student/Aufgabe';
import { Belohnung } from './screens/student/Belohnung';
import { Korrektur } from './screens/student/Korrektur';
import { Agenda } from './screens/student/Agenda';
import { Shop } from './screens/student/Shop';
import { AutoWelt } from './games/AutoWelt';
import { Baumeister } from './games/Baumeister';
import { HuepfHeld } from './games/HuepfHeld';
import { Torschuss } from './games/Torschuss';
import { DemoBar } from './components/DemoBar';
import { UpdatePrompt } from './components/pwa';
import { useStore } from './store/useStore';
import { useEffect, useState } from 'react';
import { refresh, logout } from './store/actions';
import { RuleError } from './store/rules';
import './components/ui.css';

function RequireRole({ role, children }: { role: 'kid' | 'teacher'; children: ReactNode }) {
  const session = useStore((s) => s.session);
  if (!session || session.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Jedes Spiel ist ein eigenes Modul mit gleichem Rahmen (games/GameFrame). */
function Game() {
  const { game } = useParams();
  switch (game) {
    case 'auto': return <AutoWelt />;
    case 'bau': return <Baumeister />;
    case 'huepf': return <HuepfHeld />;
    case 'tor': return <Torschuss />;
    default: return <Navigate to="/kind" replace />;
  }
}

const kid = (el: ReactNode) => <RequireRole role="kid">{el}</RequireRole>;
const teacher = (el: ReactNode) => <RequireRole role="teacher">{el}</RequireRole>;

/** Klassen-Modus: regelmässig und beim Zurückkommen neu laden; offline den letzten Stand zeigen. */
function ClassSync() {
  const mode = useStore((s) => s.mode);
  const session = useStore((s) => s.session);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    if (mode !== 'klasse' || !session) return;
    const run = () => refresh().then(() => setOffline(false), (e) => {
      if (e instanceof RuleError && /neu an/.test(e.message)) { logout(); return; }
      setOffline(true);
    });
    run();
    const t = setInterval(() => { if (document.visibilityState === 'visible') run(); }, 15_000);
    const onVis = () => { if (document.visibilityState === 'visible') run(); };
    window.addEventListener('online', run);
    window.addEventListener('offline', () => setOffline(true));
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); window.removeEventListener('online', run); document.removeEventListener('visibilitychange', onVis); };
  }, [mode, session]);
  if (mode !== 'klasse' || !session || !offline) return null;
  return <div className="offline-banner" role="status">Keine Verbindung – du siehst den letzten Stand. Entwürfe werden gespeichert, sobald du wieder online bist.</div>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/kind" element={kid(<Uebersicht />)} />
        <Route path="/kind/aufgabe/:id" element={kid(<Aufgabe />)} />
        <Route path="/kind/belohnung/:subId" element={kid(<Belohnung />)} />
        <Route path="/kind/spiel/:game" element={kid(<Game />)} />
        <Route path="/kind/shop" element={kid(<Shop />)} />
        <Route path="/kind/korrektur/:id" element={kid(<Korrektur />)} />
        <Route path="/kind/agenda" element={kid(<Agenda />)} />
        <Route path="/lehrerin" element={teacher(<Lehrerin />)} />
        <Route path="/lehrerin/neu" element={teacher(<HausaufgabeNeu />)} />
        <Route path="/lehrerin/korrigieren/:homeworkId" element={teacher(<Korrigieren />)} />
        <Route path="/lehrerin/schueler" element={teacher(<SchuelerVerwalten />)} />
        <Route path="/lehrerin/agenda" element={teacher(<AgendaLehrerin />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ClassSync />
      <DemoBar />
      <UpdatePrompt />
    </HashRouter>
  );
}
