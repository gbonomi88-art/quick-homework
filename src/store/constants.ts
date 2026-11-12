/**
 * Kalender: In der Demo ist „heute“ immer Dienstag, 17.11.2026 (DEMO_TODAY),
 * damit Erinnerungen wie „Morgen ist der Mathe-Test“ stimmen.
 * Im Klassen-Modus setzt der Server das echte Datum (setCalendar).
 */
export const DEMO_CALENDAR = { monday: '2026-11-16', weekday: 1 };
const cal = { monday: parseISO(DEMO_CALENDAR.monday), weekday: DEMO_CALENDAR.weekday };
/** Aktuelles „heute“ (Wochentag 0 = Montag … 4 = Freitag). Live-Objekt. */
export const DEMO_TODAY = {
  get weekday() { return cal.weekday; },
};
export function setCalendar(c?: { monday: string; weekday: number }) {
  const v = c ?? DEMO_CALENDAR;
  cal.monday = parseISO(v.monday);
  cal.weekday = Math.max(0, Math.min(4, v.weekday));
}
function parseISO(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const dayOf = (weekOffset: number, weekday: number) => new Date(cal.monday.getFullYear(), cal.monday.getMonth(), cal.monday.getDate() + weekOffset * 7 + weekday);

export const CLASS_NAME = '6c';
export const TEACHER_TITLE = 'Frau Brunner';
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'] as const;

export function dateLabel(weekOffset: number, weekday: number): string {
  const d = dayOf(weekOffset, weekday);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}
export function weekTitle(weekOffset: number): string {
  const a = dayOf(weekOffset, 0), b = dayOf(weekOffset, 4);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}.–${b.getDate()}. ${MONTHS[a.getMonth()]}`
    : `${a.getDate()}. ${MONTHS[a.getMonth()].slice(0, 3)}. – ${b.getDate()}. ${MONTHS[b.getMonth()].slice(0, 3)}.`;
}
