import { useState } from 'react';
import type { WeekOffset } from '../../store/types';
import { SubHeader } from '../../components/StudentHeader';
import { AgendaWeek } from '../../components/AgendaWeek';
import { useKid } from './useKid';

export function Agenda() {
  const { data } = useKid();
  const [week, setWeek] = useState<WeekOffset>(0);
  return (
    <div className="app">
      <SubHeader title="Agenda" />
      <main className="grid-bg" style={{ flexGrow: 1, display: 'flex', padding: '22px max(16px, min(40px, 3vw)) calc(80px + var(--safe-bottom))' }}>
        <AgendaWeek data={data} week={week} onWeek={setWeek} />
      </main>
    </div>
  );
}
