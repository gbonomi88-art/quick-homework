/** Demo-Heute: Dienstag, 17.11.2026. Alle Erinnerungen beziehen sich darauf. */
export const DEMO_TODAY = { year: 2026, month: 11, day: 17, weekday: 1 as const };
export const CLASS_NAME = '6c';
export const TEACHER_TITLE = 'Frau Brunner';
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'] as const;
/** Montag der Woche (Tag im November) je Wochen-Offset. */
const MONDAY: Record<number, number> = { [-1]: 9, 0: 16, 1: 23 };
export function dateLabel(weekOffset: -1 | 0 | 1, weekday: number): string {
  return `${MONDAY[weekOffset] + weekday}.11.`;
}
export function weekTitle(weekOffset: -1 | 0 | 1): string {
  const m = MONDAY[weekOffset];
  return `${m}.–${m + 4}. November`;
}
