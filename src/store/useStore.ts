import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSeed } from './seed';
import type { DemoData } from './types';
import { setCalendar } from './constants';

export type Session = { role: 'kid'; studentId: string } | { role: 'teacher' };

export type Mode = 'demo' | 'klasse';

interface StoreState {
  /** demo = alles lokal auf diesem Gerät · klasse = Supabase (online, mehrere Geräte) */
  mode: Mode;
  data: DemoData;
  /** Demo-Daten, solange der Klassen-Modus aktiv ist. */
  demoBackup: DemoData | null;
  /** Klassen-Modus: noch nicht gespeicherte Entwürfe (offline). */
  pendingDrafts: Record<string, string[]>;
  syncError: string | null;
  session: Session | null;
  rememberSession: boolean;
  /** Wendet eine Regel-Funktion aus rules.ts an. */
  apply: (fn: (d: DemoData) => DemoData) => void;
  login: (s: Session, remember: boolean) => void;
  logout: () => void;
  resetDemo: () => void;
  enterClass: (data: DemoData, session: Session, remember: boolean) => void;
  leaveClass: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      mode: 'demo',
      data: createSeed(),
      demoBackup: null,
      pendingDrafts: {},
      syncError: null,
      session: null,
      rememberSession: false,
      apply: (fn) => set((st) => ({ data: fn(st.data) })),
      login: (session, remember) => set({ session, rememberSession: remember }),
      logout: () => set({ session: null, rememberSession: false }),
      resetDemo: () => set({ data: createSeed(), session: null, rememberSession: false }),
      enterClass: (data, session, remember) => set((st) => ({
        mode: 'klasse', data, session, rememberSession: remember, demoBackup: st.mode === 'demo' ? st.data : st.demoBackup, syncError: null,
      })),
      leaveClass: () => set((st) => ({
        mode: 'demo', data: st.demoBackup ?? createSeed(), demoBackup: null, session: null, rememberSession: false, pendingDrafts: {}, syncError: null,
      })),
    }),
    {
      name: 'quick-homework-demo',
      version: 1,
      partialize: (st) => ({ mode: st.mode, data: st.data, demoBackup: st.demoBackup, pendingDrafts: st.pendingDrafts, rememberSession: st.rememberSession, session: st.session }),
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

/**
 * Neuladen im selben Tab bleibt angemeldet (Timer, Entwürfe).
 * Ein neuer Start (neuer Tab, App neu geöffnet) meldet ab – ausser „Passwort auf diesem Gerät merken“ war aktiv.
 */
export function applySessionPolicy(onLogout?: () => void) {
  try {
    if (!sessionStorage.getItem('qh-tab')) {
      if (!useStore.getState().rememberSession && useStore.getState().session) { useStore.setState({ session: null }); onLogout?.(); }
      sessionStorage.setItem('qh-tab', '1');
    }
  } catch { /* Speicher blockiert: nichts tun */ }
}

// Kalender folgt den aktiven Daten (Demo: 17.11.2026, Klasse: echtes Datum).
setCalendar(useStore.getState().data.calendar);
useStore.subscribe((st, prev) => { if (st.data.calendar !== prev.data.calendar) setCalendar(st.data.calendar); });
