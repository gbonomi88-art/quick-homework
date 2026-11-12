import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSeed } from './seed';
import type { DemoData } from './types';

export type Session = { role: 'kid'; studentId: string } | { role: 'teacher' };

interface StoreState {
  data: DemoData;
  session: Session | null;
  rememberSession: boolean;
  /** Wendet eine Regel-Funktion aus rules.ts an. */
  apply: (fn: (d: DemoData) => DemoData) => void;
  login: (s: Session, remember: boolean) => void;
  logout: () => void;
  resetDemo: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      data: createSeed(),
      session: null,
      rememberSession: false,
      apply: (fn) => set((st) => ({ data: fn(st.data) })),
      login: (session, remember) => set({ session, rememberSession: remember }),
      logout: () => set({ session: null, rememberSession: false }),
      resetDemo: () => set({ data: createSeed(), session: null, rememberSession: false }),
    }),
    {
      name: 'quick-homework-demo',
      version: 1,
      // Sitzung nur behalten, wenn „Passwort auf diesem Gerät merken“ gewählt ist.
      partialize: (st) => ({ data: st.data, rememberSession: st.rememberSession, session: st.rememberSession ? st.session : null }),
    },
  ),
);

/** Demo-Login: prüft Name + Passwort gegen die lokalen Demo-Konten. */
export function checkLogin(data: DemoData, role: 'kid' | 'teacher', name: string, password: string): Session | null {
  const n = name.trim().toLowerCase().replace(/^frau\s+/, '');
  if (role === 'teacher') {
    return n === data.teacher.login.toLowerCase() && password === data.teacher.password ? { role: 'teacher' } : null;
  }
  const s = data.students.find((x) => x.name.toLowerCase() === n);
  return s && s.password === password ? { role: 'kid', studentId: s.id } : null;
}
