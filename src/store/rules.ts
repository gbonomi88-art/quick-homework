/**
 * Regeln aus SPEC §9 als reine Funktionen (ohne React), damit sie testbar
 * und später auch in einem Backend wiederverwendbar sind.
 * Jede Funktion bekommt den Zustand und gibt einen neuen Zustand zurück.
 */
import type { DemoData, Student, Submission, Task } from './types';

export class RuleError extends Error {}

const mapStudent = (d: DemoData, id: string, fn: (s: Student) => Student): DemoData => ({
  ...d, students: d.students.map((s) => (s.id === id ? fn({ ...s }) : s)),
});
const mapSub = (d: DemoData, id: string, fn: (s: Submission) => Submission): DemoData => ({
  ...d, submissions: d.submissions.map((s) => (s.id === id ? fn({ ...s }) : s)),
});
const findSub = (d: DemoData, id: string) => {
  const s = d.submissions.find((x) => x.id === id);
  if (!s) throw new RuleError('Abgabe nicht gefunden');
  return s;
};
const unlockIfPositive = (s: Student): Student => (s.coins > 0 ? { ...s, lockedUntilPositive: false } : s);

/** §9.1 Spielgeld-Betrag: nur 10er-Schritte, Minimum 0. */
export function changeCoinsPerSubmission(d: DemoData, delta: 10 | -10): DemoData {
  const v = Math.max(0, d.settings.coinsPerSubmission + delta);
  return { ...d, settings: { ...d.settings, coinsPerSubmission: Math.round(v / 10) * 10 } };
}

export function setMaxMinutes(d: DemoData, minutes: number): DemoData {
  const v = Math.min(30, Math.max(5, Math.round(minutes / 5) * 5));
  return { ...d, settings: { ...d.settings, maxMinutes: v } };
}

/** §9.1 Abgeben: +coinsPerSubmission. */
export function submitHomework(d: DemoData, submissionId: string, answers: string[]): DemoData {
  const sub = findSub(d, submissionId);
  if (sub.status !== 'offen') throw new RuleError('Diese Hausaufgabe ist schon abgegeben');
  if (answers.some((a) => a.trim() === '')) throw new RuleError('Bitte zuerst alle Aufgaben ausfüllen');
  const amount = d.settings.coinsPerSubmission;
  const next = mapSub(d, submissionId, (s) => ({
    ...s, answers, status: 'abgegeben', baseReward: amount, reward: amount, rewardUsed: false,
  }));
  return mapStudent(next, sub.studentId, (s) => unlockIfPositive({ ...s, coins: s.coins + amount }));
}

/** §9.1 Korrektur: fehlerfrei → insgesamt das Doppelte. */
export function gradeSubmission(d: DemoData, submissionId: string, grading: boolean[], comment: string): DemoData {
  const sub = findSub(d, submissionId);
  if (sub.status !== 'abgegeben') throw new RuleError('Nur abgegebene Hausaufgaben können korrigiert werden');
  const base = sub.baseReward ?? d.settings.coinsPerSubmission;
  const perfect = grading.length > 0 && grading.every(Boolean);
  const bonus = perfect ? base : 0;
  const next = mapSub(d, submissionId, (s) => ({
    ...s, status: 'korrigiert', grading, comment, reward: base + bonus, seenByStudent: false,
  }));
  return bonus ? mapStudent(next, sub.studentId, (s) => unlockIfPositive({ ...s, coins: s.coins + bonus })) : next;
}

/** §9.2 Nicht gemacht (nur bei Status „offen“). */
export function markNotDone(d: DemoData, submissionId: string): DemoData {
  const sub = findSub(d, submissionId);
  if (sub.status !== 'offen') throw new RuleError('Nur offene Hausaufgaben können als „nicht gemacht“ markiert werden');
  const amount = d.settings.coinsPerSubmission;
  const next = mapSub(d, submissionId, (s) => ({ ...s, status: 'nichtgemacht' }));
  return mapStudent(next, sub.studentId, (s) => {
    const forgotten = s.forgottenThisMonth + 1;
    const out = { ...s, forgottenThisMonth: forgotten, skipNextGame: true };
    if (forgotten >= 2) {
      out.coins -= amount;
      if (out.coins <= 0) out.lockedUntilPositive = true;
    }
    return out;
  });
}

export type LockReason = 'keine' | 'gestrichen' | 'schulden';

/** §9.2 Welche Sperre gilt gerade? Schulden haben Vorrang in der Anzeige. */
export function lockReason(s: Student): LockReason {
  if (s.lockedUntilPositive && s.coins <= 0) return 'schulden';
  if (s.skipNextGame) return 'gestrichen';
  return 'keine';
}

/**
 * Belohnung für eine Abgabe ansehen. Ist das Kind gesperrt, verfällt diese
 * Belohnung und `skipNextGame` wird zurückgesetzt (nur diese eine verpasste Belohnung).
 */
export function claimReward(d: DemoData, submissionId: string): { data: DemoData; reason: LockReason } {
  const sub = findSub(d, submissionId);
  const st = d.students.find((s) => s.id === sub.studentId)!;
  const reason = lockReason(st);
  if (reason === 'keine' || sub.rewardUsed) return { data: d, reason };
  let next = mapSub(d, submissionId, (s) => ({ ...s, rewardUsed: true }));
  next = mapStudent(next, st.id, (s) => ({ ...s, skipNextGame: false }));
  return { data: next, reason };
}

/** §9.3 1 Spiel pro Abgabe, nur erlaubte Spiele. */
export function startGame(d: DemoData, submissionId: string, game: DemoData['settings']['allowedGames'][number], now: number): DemoData {
  const sub = findSub(d, submissionId);
  const st = d.students.find((s) => s.id === sub.studentId)!;
  if (sub.status === 'offen' || sub.status === 'nichtgemacht') throw new RuleError('Zuerst die Hausaufgabe abgeben');
  if (sub.rewardUsed) throw new RuleError('Für diese Abgabe wurde schon gespielt');
  if (lockReason(st) !== 'keine') throw new RuleError('Spielen ist gesperrt');
  if (!d.settings.allowedGames.includes(game)) throw new RuleError('Dieses Spiel ist nicht erlaubt');
  const next = mapSub(d, submissionId, (s) => ({ ...s, rewardUsed: true }));
  return { ...next, gameSession: { submissionId, game, startedAt: now, skippedMs: 0 } };
}

/** §9.4 Timer über echte Zeit. */
export function timeLeftMs(session: { startedAt: number; skippedMs: number }, maxMinutes: number, now: number): number {
  return Math.max(0, maxMinutes * 60_000 - (now - session.startedAt) - session.skippedMs);
}
export type TimerPhase = 'gruen' | 'orange' | 'rot' | 'aus';
export function timerPhase(leftMs: number): TimerPhase {
  if (leftMs <= 0) return 'aus';
  if (leftMs <= 60_000) return 'rot';
  if (leftMs <= 300_000) return 'orange';
  return 'gruen';
}

/** §9.1 Shop: Kontostand nie unter 0. */
export function buy(d: DemoData, studentId: string, price: number): DemoData {
  const st = d.students.find((s) => s.id === studentId);
  if (!st) throw new RuleError('Kind nicht gefunden');
  if (price < 0) throw new RuleError('Ungültiger Preis');
  if (st.coins < price) throw new RuleError('Zu wenig Spielgeld');
  return mapStudent(d, studentId, (s) => ({ ...s, coins: s.coins - price }));
}

/** Automatische Vorprüfung für die Lehrerin. */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!]$/, '');
export function autoCheck(task: Task, answer: string): boolean | undefined {
  if (task.kind === 'compare') return answer.trim() === task.solution;
  if (task.kind === 'transform') return norm(answer) === norm(task.solution);
  if (task.sampleSolution) return norm(answer).includes(norm(task.sampleSolution));
  return undefined; // freie Antwort: Lehrerin entscheidet
}
