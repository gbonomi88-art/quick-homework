/**
 * Alle Änderungen laufen über diese Aktionen.
 * Demo-Modus: Regeln aus rules.ts lokal anwenden.
 * Klassen-Modus: geprüfte Server-Funktion (Supabase) aufrufen, danach Zustand neu laden.
 */
import { useStore, type Session } from './useStore';
import * as R from './rules';
import type { AgendaEvent, ChatMessage, DemoData, GameId, Homework, Student } from './types';
import { changeOwnPassword, fetchState, OfflineError, rpc, signIn, signOut } from '../backend/supabase';

const st = () => useStore.getState();
const cloud = () => st().mode === 'klasse';
const local = (fn: (d: DemoData) => DemoData) => st().apply(fn);

/** Klassen-Modus: Zustand vom Server holen (Entwürfe, die noch nicht gespeichert sind, bleiben erhalten). */
export async function refresh(): Promise<void> {
  if (!cloud()) return;
  await flushDrafts();
  const { data } = await fetchState();
  const pending = st().pendingDrafts;
  data.submissions = data.submissions.map((s) => (pending[s.id] && s.status === 'offen' ? { ...s, answers: pending[s.id] } : s));
  useStore.setState({ data, syncError: null });
}

async function server(fn: string, args?: Record<string, unknown>) {
  await rpc(fn, args);
  await refresh().catch(() => undefined);
}

// ---------- Entwürfe (offline-fähig) ----------
let draftTimer: ReturnType<typeof setTimeout> | undefined;
async function flushDrafts() {
  const pending = { ...st().pendingDrafts };
  for (const [id, answers] of Object.entries(pending)) {
    await rpc('qh_save_draft', { p_sub: id, p_answers: answers });
    const rest = { ...st().pendingDrafts };
    if (rest[id] === answers) delete rest[id];
    useStore.setState({ pendingDrafts: rest });
  }
}

// ---------- Anmeldung ----------
export async function loginClass(role: 'kid' | 'teacher', name: string, password: string, remember: boolean): Promise<'ok' | 'falsch' | 'rolle'> {
  if ((await signIn(name, password)) === 'falsch') return 'falsch';
  const { data, me } = await fetchState();
  if (me.role !== role) { await signOut(); return 'rolle'; }
  const session: Session = me.role === 'teacher' ? { role: 'teacher' } : { role: 'kid', studentId: me.id };
  st().enterClass(data, session, remember);
  return 'ok';
}

export async function logout() {
  if (cloud()) { await flushDrafts().catch(() => undefined); await signOut(); }
  st().logout();
}

export const act = {
  // ----- Kind -----
  saveDraft(subId: string, answers: string[]) {
    local((d) => R.saveDraft(d, subId, answers));
    if (!cloud()) return;
    useStore.setState({ pendingDrafts: { ...st().pendingDrafts, [subId]: answers } });
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => { flushDrafts().catch(() => undefined); }, 800);
  },
  async submit(subId: string, answers: string[]) {
    if (!cloud()) return local((d) => R.submitHomework(d, subId, answers));
    await rpc('qh_submit', { p_sub: subId, p_answers: answers });
    const rest = { ...st().pendingDrafts }; delete rest[subId];
    useStore.setState({ pendingDrafts: rest });
    await refresh().catch(() => undefined);
  },
  async claimReward(subId: string) {
    if (!cloud()) return local((d) => R.claimReward(d, subId).data);
    await server('qh_claim_reward', { p_sub: subId });
  },
  async startGame(subId: string, game: GameId) {
    if (!cloud()) return local((d) => R.startGame(d, subId, game, Date.now()));
    await server('qh_start_game', { p_sub: subId, p_game: game });
  },
  async endGame() {
    local((d) => ({ ...d, gameSession: undefined }));
    if (cloud()) await rpc('qh_end_game').catch(() => undefined);
  },
  async skipTime(ms: number) {
    local((d) => (d.gameSession ? { ...d, gameSession: { ...d.gameSession, skippedMs: d.gameSession.skippedMs + ms } } : d));
    if (cloud()) await rpc('qh_skip_time', { p_ms: Math.round(ms) });
  },
  async markSeen(subId: string) {
    local((d) => R.markSeen(d, subId));
    if (cloud()) await rpc('qh_mark_seen', { p_sub: subId }).catch(() => undefined);
  },
  async chat(studentId: string, homeworkId: string, msgs: ChatMessage[], greeting: ChatMessage) {
    const key = `${studentId}:${homeworkId}`;
    const first = !st().data.chats[key];
    local((d) => ({ ...d, chats: { ...d.chats, [key]: [...(d.chats[key] ?? [greeting]), ...msgs] } }));
    if (cloud()) await rpc('qh_chat_append', { p_homework: homeworkId, p_messages: first ? [greeting, ...msgs] : msgs }).catch(() => undefined);
  },
  async saveCity(studentId: string, cells: string[]) {
    local((d) => ({ ...d, buildCity: { ...d.buildCity, [studentId]: cells } }));
    if (cloud()) await rpc('qh_save_city', { p_cells: cells }).catch(() => undefined);
  },
  async shop(studentId: string, item: string) {
    if (!cloud()) return local((d) => R.shop(d, studentId, item));
    await server('qh_shop', { p_item: item });
  },
  // ----- Konto (Kind und Lehrerin) -----
  async setPhoto(who: { role: 'kid'; id: string } | { role: 'teacher' }, photo: string) {
    if (who.role === 'kid') local((d) => ({ ...d, students: d.students.map((s) => (s.id === who.id ? { ...s, photo } : s)) }));
    else local((d) => ({ ...d, teacher: { ...d.teacher, photo } }));
    if (cloud()) await server('qh_set_photo', { p_photo: photo });
  },
  async changePassword(who: { role: 'kid'; id: string } | { role: 'teacher' }, oldPw: string, newPw: string) {
    if (newPw.length < 6) throw new R.RuleError('Das neue Passwort braucht mindestens 6 Zeichen.');
    const d = st().data;
    const name = who.role === 'kid' ? d.students.find((s) => s.id === who.id)!.name : d.teacher.login;
    if (cloud()) return changeOwnPassword(name, oldPw, newPw);
    const current = who.role === 'kid' ? d.students.find((s) => s.id === who.id)!.password : d.teacher.password;
    if (oldPw !== current) throw new R.RuleError('Das alte Passwort stimmt nicht.');
    if (who.role === 'kid') local((x) => ({ ...x, students: x.students.map((s) => (s.id === who.id ? { ...s, password: newPw } : s)) }));
    else local((x) => ({ ...x, teacher: { ...x.teacher, password: newPw } }));
  },
  // ----- Lehrerin -----
  async grade(subId: string, grading: boolean[], comment: string) {
    if (!cloud()) return local((d) => R.gradeSubmission(d, subId, grading, comment));
    await server('qh_grade', { p_sub: subId, p_grading: grading, p_comment: comment });
  },
  async markNotDone(subId: string) {
    if (!cloud()) return local((d) => R.markNotDone(d, subId));
    await server('qh_mark_not_done', { p_sub: subId });
  },
  async coins(delta: 10 | -10) {
    if (!cloud()) return local((d) => R.changeCoinsPerSubmission(d, delta));
    await server('qh_update_settings', { p_patch: { coinsDelta: delta } });
  },
  async maxMinutes(m: number) {
    local((d) => R.setMaxMinutes(d, m));
    if (cloud()) await server('qh_update_settings', { p_patch: { maxMinutes: m } });
  },
  async toggleGame(g: GameId) {
    const next = R.toggleGame(st().data, g);
    local(() => next);
    if (cloud()) await server('qh_update_settings', { p_patch: { allowedGames: next.settings.allowedGames } });
  },
  async hausi(k: 'hausiTeacherCanRead' | 'hausiSchoolTopicsOnly', v: boolean) {
    local((d) => R.setSetting(d, k, v));
    if (cloud()) await server('qh_update_settings', { p_patch: { [k]: v } });
  },
  async startImage(img: string | undefined) {
    local((d) => R.setSetting(d, 'startImage', img));
    if (cloud()) await server('qh_update_settings', { p_patch: { startImage: img ?? null } });
  },
  async createHomework(h: Omit<Homework, 'id' | 'createdBy' | 'dueWeekOffset'>) {
    const err = R.validateHomework(h);
    if (err) throw new R.RuleError(err);
    if (!cloud()) return local((d) => R.createHomework(d, h));
    await server('qh_create_homework', { p: h });
  },
  async addStudent(name: string, password: string) {
    if (!cloud()) return local((d) => R.addStudent(d, name, password));
    await server('qh_add_student', { p_name: name, p_password: password });
  },
  async updateStudent(id: string, patch: Pick<Student, 'name'> & { password?: string }) {
    if (!cloud()) return local((d) => R.updateStudent(d, id, patch));
    await server('qh_update_student', { p_id: id, p_name: patch.name, p_password: patch.password ?? '' });
  },
  async addEvent(e: Omit<AgendaEvent, 'id'>) {
    if (!cloud()) return local((d) => R.addEvent(d, e));
    if (!e.title.trim()) throw new R.RuleError('Bitte einen Titel eingeben.');
    await server('qh_add_event', { p: e });
  },
  async deleteEvent(id: string) {
    if (!cloud()) return local((d) => R.deleteEvent(d, id));
    await server('qh_delete_event', { p_id: id });
  },
  async resetClass() { await server('qh_reset_class'); },
};

/** Fehlertext für die Oberfläche. */
export function errorText(e: unknown): string {
  if (e instanceof OfflineError || e instanceof R.RuleError) return e.message;
  console.error(e);
  return 'Das hat leider nicht geklappt. Bitte versuche es nochmal.';
}
