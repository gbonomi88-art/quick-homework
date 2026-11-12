import { useStore } from '../../store/useStore';

/** Aktuell angemeldetes Kind (Route ist durch RequireRole geschützt). */
export function useKid() {
  const data = useStore((s) => s.data);
  const session = useStore((s) => s.session);
  const id = session?.role === 'kid' ? session.studentId : '';
  const student = data.students.find((s) => s.id === id) ?? data.students[0];
  return { data, student };
}
