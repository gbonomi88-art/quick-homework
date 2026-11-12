import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

/** Platzhalter, bis der Screen umgesetzt ist. */
export function Placeholder({ title }: { title: string }) {
  const logout = useStore((s) => s.logout);
  const nav = useNavigate();
  return (
    <main className="grid-bg" style={{ minHeight: '100dvh', padding: 'calc(40px + var(--safe-top)) 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <h1 style={{ margin: 0, fontWeight: 900 }}>{title}</h1>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>Dieser Bereich wird gerade gebaut.</p>
      <button type="button" onClick={() => { logout(); nav('/'); }}
        style={{ height: 48, padding: '0 20px', borderRadius: 16, border: 0, background: 'var(--brand)', color: '#fff', fontWeight: 800 }}>
        Abmelden
      </button>
    </main>
  );
}
