import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Login } from './screens/Login';
import { Placeholder } from './screens/Placeholder';
import { DemoBar } from './components/DemoBar';
import { UpdatePrompt } from './components/pwa';
import { useStore } from './store/useStore';

function RequireRole({ role, children }: { role: 'kid' | 'teacher'; children: ReactNode }) {
  const session = useStore((s) => s.session);
  if (!session || session.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/kind/*" element={<RequireRole role="kid"><Placeholder title="Hallo Mattia!" /></RequireRole>} />
        <Route path="/lehrerin/*" element={<RequireRole role="teacher"><Placeholder title="Lehrerin-Bereich" /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DemoBar />
      <UpdatePrompt />
    </HashRouter>
  );
}
