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
      <DemoBar />
      <UpdatePrompt />
    </HashRouter>
  );
}
