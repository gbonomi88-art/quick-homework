/**
 * Regeln aus SPEC §9 als reine Funktionen (ohne React), damit sie testbar
 * und später auch in einem Backend wiederverwendbar sind.
 * Jede Funktion bekommt den Zustand und gibt einen neuen Zustand zurück.
 */
import type { AgendaEvent, DemoData, GameId, Homework, Settings, Student, Submission, Task } from './types';
import { DEMO_TODAY } from './constants';

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

/** Entwurf speichern (nur solange offen). */
export function saveDraft(d: DemoData, submissionId: string, answers: string[]): DemoData {
  const sub = findSub(d, submissionId);
  if (sub.status !== 'offen') return d;
  return mapSub(d, submissionId, (s) => ({ ...s, answers }));
}

/** Kind hat die Korrektur angesehen („Verstanden“). */
export function markSeen(d: DemoData, submissionId: string): DemoData {
  return mapSub(d, submissionId, (s) => ({ ...s, seenByStudent: true }));
}

// ---------- Lehrerin ----------

let idCounter = 0;
export const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** Abgabetag vor heute → nächste Woche, sonst diese Woche. */
export const weekForWeekday = (wd: number): 0 | 1 => (wd < DEMO_TODAY.weekday ? 1 : 0);

export function validateHomework(h: Omit<Homework, 'id' | 'createdBy' | 'dueWeekOffset'>): string | null {
  if (!h.title.trim()) return 'Bitte einen Titel eingeben.';
  if (h.tasks.length === 0) return 'Bitte mindestens eine Aufgabe eintragen.';
  for (const [i, t] of h.tasks.entries()) {
    const n = `Aufgabe ${i + 1}`;
    if (t.kind === 'compare' && (!t.left.trim() || !t.right.trim())) return `${n}: Bitte links und rechts ausfüllen.`;
    if (t.kind === 'question' && !t.question.trim()) return `${n}: Bitte eine Frage eingeben.`;
    if (t.kind === 'transform' && (!t.word.trim() || !t.solution.trim())) return `${n}: Bitte Wort und Lösung eingeben.`;
  }
  return null;
}

/** „An Klasse verteilen“: Hausaufgabe anlegen + für jedes Kind eine offene Abgabe. */
export function createHomework(d: DemoData, h: Omit<Homework, 'id' | 'createdBy' | 'dueWeekOffset'>): DemoData {
  const err = validateHomework(h);
  if (err) throw new RuleError(err);
  const hw: Homework = { ...h, id: newId('hw'), createdBy: 'teacher', dueWeekOffset: weekForWeekday(h.dueWeekday) };
  const subs: Submission[] = d.students.map((s) => ({
    id: `sub-${hw.id}-${s.id}`, homeworkId: hw.id, studentId: s.id, answers: hw.tasks.map(() => ''), status: 'offen',
  }));
  return { ...d, homeworks: [...d.homeworks, hw], submissions: [...d.submissions, ...subs] };
}

/** Kind hinzufügen: startet mit 0 Spielgeld und bekommt die aktuellen Hausaufgaben. */
export function addStudent(d: DemoData, name: string, password: string): DemoData {
  const n = name.trim();
  if (!n || !password.trim()) throw new RuleError('Bitte Name und Passwort eingeben.');
  if (d.students.some((s) => s.name.toLowerCase() === n.toLowerCase())) throw new RuleError('Diesen Namen gibt es schon in der Klasse.');
  const id = newId('kid');
  const st: Student = { id, name: n, password: password.trim(), coins: 0, forgottenThisMonth: 0, skipNextGame: false, lockedUntilPositive: false, isNew: true };
  const subs: Submission[] = d.homeworks.filter((h) => h.dueWeekOffset >= 0).map((h) => ({
    id: `sub-${h.id}-${id}`, homeworkId: h.id, studentId: id, answers: h.tasks.map(() => ''), status: 'offen',
  }));
  return { ...d, students: [...d.students, st], submissions: [...d.submissions, ...subs] };
}

/** Name/Passwort ändern. Spielgeld ist hier bewusst nicht änderbar. */
export function updateStudent(d: DemoData, id: string, patch: { name?: string; password?: string }): DemoData {
  const name = patch.name?.trim();
  const password = patch.password?.trim();
  if (name !== undefined && !name) throw new RuleError('Bitte einen Namen eingeben.');
  if (password !== undefined && !password) throw new RuleError('Bitte ein Passwort eingeben.');
  if (name && d.students.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) throw new RuleError('Diesen Namen gibt es schon in der Klasse.');
  return mapStudent(d, id, (s) => ({ ...s, ...(name ? { name } : {}), ...(password ? { password } : {}) }));
}

export function addEvent(d: DemoData, e: Omit<AgendaEvent, 'id'>): DemoData {
  if (!e.title.trim()) throw new RuleError('Bitte einen Titel eingeben.');
  return { ...d, events: [...d.events, { ...e, title: e.title.trim(), note: e.note?.trim() || undefined, id: newId('ev') }] };
}
export function deleteEvent(d: DemoData, id: string): DemoData {
  return { ...d, events: d.events.filter((e) => e.id !== id) };
}

export function toggleGame(d: DemoData, g: GameId): DemoData {
  const has = d.settings.allowedGames.includes(g);
  const next = has ? d.settings.allowedGames.filter((x) => x !== g) : [...d.settings.allowedGames, g];
  if (next.length === 0) throw new RuleError('Mindestens ein Spiel muss erlaubt bleiben.');
  return { ...d, settings: { ...d.settings, allowedGames: (['auto', 'bau', 'huepf', 'tor'] as GameId[]).filter((x) => next.includes(x)) } };
}
export function setSetting<K extends 'hausiTeacherCanRead' | 'hausiSchoolTopicsOnly' | 'startImage'>(d: DemoData, k: K, v: Settings[K]): DemoData {
  return { ...d, settings: { ...d.settings, [k]: v } };
}

// ---------- Shop (gleiche Preise wie in supabase/schema.sql) ----------
export const DEFAULT_GARAGE = { ownedCars: ['flitzer'], activeCar: 'flitzer', color: '#E0352B', tuning: [] as string[] };
export const SHOP_COLORS = ['#E0352B', '#1F4E8C', '#2F7D4F', '#F2B33D', '#FFFFFF'];
export const PRICES = { color: 50, felgen: 100, spoiler: 150, turbo: 200, bus: 300, gelaende: 450, renner: 600 } as const;

/** Artikel kaufen: „color:#hex“, „tuning:felgen“, „car:bus“ oder „drive:bus“ (eigenes Auto fahren). */
export function shop(d: DemoData, studentId: string, item: string): DemoData {
  const [kind, val] = item.split(':');
  const g = { ...DEFAULT_GARAGE, ...(d.garages[studentId] ?? {}) };
  let price: number;
  let next = g;
  if (kind === 'color' && SHOP_COLORS.includes(val)) { price = PRICES.color; next = { ...g, color: val }; }
  else if (kind === 'tuning' && (val === 'felgen' || val === 'spoiler' || val === 'turbo')) {
    if (g.tuning.includes(val)) throw new RuleError('Schon eingebaut');
    price = PRICES[val]; next = { ...g, tuning: [...g.tuning, val] };
  } else if (kind === 'car' && (val === 'bus' || val === 'gelaende' || val === 'renner')) {
    if (g.ownedCars.includes(val)) throw new RuleError('Gehört dir schon');
    price = PRICES[val]; next = { ...g, ownedCars: [...g.ownedCars, val], activeCar: val };
  } else if (kind === 'drive') {
    if (!g.ownedCars.includes(val)) throw new RuleError('Dieses Auto gehört dir nicht');
    price = 0; next = { ...g, activeCar: val };
  } else throw new RuleError('Unbekannter Artikel');
  const after = buy(d, studentId, price);
  return { ...after, garages: { ...after.garages, [studentId]: next } };
}
