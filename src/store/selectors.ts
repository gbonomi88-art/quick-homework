import { DEMO_TODAY, TEACHER_TITLE } from './constants';
import type { AgendaEvent, DemoData, Homework, Submission, WeekOffset } from './types';
import { SUBJECTS } from '../data/subjects';

export interface HomeworkEntry { hw: Homework; sub: Submission }

export function studentEntries(d: DemoData, studentId: string): HomeworkEntry[] {
  return d.submissions
    .filter((s) => s.studentId === studentId)
    .map((sub) => ({ sub, hw: d.homeworks.find((h) => h.id === sub.homeworkId)! }))
    .filter((e) => e.hw)
    .sort((a, b) => a.hw.dueWeekOffset - b.hw.dueWeekOffset || a.hw.dueWeekday - b.hw.dueWeekday);
}

/** Hausaufgaben ab dieser Woche (für Übersicht und Fortschritt). */
export const currentEntries = (d: DemoData, studentId: string) => studentEntries(d, studentId).filter((e) => e.hw.dueWeekOffset >= 0);

export const isDone = (s: Submission) => s.status === 'abgegeben' || s.status === 'korrigiert';

export const SHORT_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

/** Kurzname eines Termins, z. B. „Mathe-Test: Brüche …“ → „Mathe-Test“. */
export const eventShort = (e: AgendaEvent) => e.title.split(':')[0].trim();

export function tomorrowTests(d: DemoData): AgendaEvent[] {
  const t = DEMO_TODAY.weekday + 1;
  return d.events.filter((e) => e.weekOffset === 0 && e.weekday === t && e.type === 'test');
}

export function upcomingEvents(d: DemoData, n = 2): AgendaEvent[] {
  const key = (e: AgendaEvent) => e.weekOffset * 10 + e.weekday + (e.time ? Number(e.time.replace(':', '')) / 10000 : 0);
  const today = DEMO_TODAY.weekday;
  return d.events.filter((e) => e.weekOffset > 0 || (e.weekOffset === 0 && e.weekday >= today)).sort((a, b) => key(a) - key(b)).slice(0, n);
}

export type Reminder =
  | { kind: 'korrigiert'; label: string; text: string; to: string }
  | { kind: 'heute'; label: string; text: string; to: string }
  | { kind: 'morgen'; label: string; text: string; to: string };

export function reminders(d: DemoData, studentId: string): Reminder[] {
  const out: Reminder[] = [];
  const entries = studentEntries(d, studentId);
  for (const e of entries.filter((x) => x.sub.status === 'korrigiert' && !x.sub.seenByStudent)) {
    out.push({ kind: 'korrigiert', label: 'NEU KORRIGIERT', text: `${SUBJECTS[e.hw.subject].label}: ${e.hw.title} – ansehen`, to: `/kind/korrektur/${e.hw.id}` });
  }
  for (const e of entries.filter((x) => x.sub.status === 'offen' && x.hw.dueWeekOffset === 0 && x.hw.dueWeekday === DEMO_TODAY.weekday)) {
    out.push({ kind: 'heute', label: 'HEUTE ABGEBEN', text: `${SUBJECTS[e.hw.subject].label}: ${e.hw.title}`, to: `/kind/aufgabe/${e.hw.id}` });
  }
  for (const t of tomorrowTests(d)) {
    out.push({ kind: 'morgen', label: 'MORGEN', text: `${eventShort(t)}${t.time ? ` um ${t.time}` : ''}`, to: '/kind/agenda' });
  }
  return out;
}

export type AgendaItem = (AgendaEvent | (Omit<AgendaEvent, 'type'> & { type: 'abgabe' })) & { own: boolean };

/** Termine + automatische Abgaben einer Woche. */
export function agendaItems(d: DemoData, week: WeekOffset): AgendaItem[] {
  const ev: AgendaItem[] = d.events.filter((e) => e.weekOffset === week).map((e) => ({ ...e, own: true }));
  const due: AgendaItem[] = d.homeworks.filter((h) => h.dueWeekOffset === week).map((h) => ({
    id: `due-${h.id}`, weekOffset: week, weekday: h.dueWeekday, type: 'abgabe' as const,
    title: `${SUBJECTS[h.subject].label}: ${h.title}`, own: false,
  }));
  return [...ev, ...due].sort((a, b) => a.weekday - b.weekday || (a.type === 'abgabe' ? 1 : 0) - (b.type === 'abgabe' ? 1 : 0) || (a.time ?? '').localeCompare(b.time ?? ''));
}

export const teacherSays = () => `${TEACHER_TITLE} schreibt:`;
