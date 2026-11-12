import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/backend';
import { CLASS_NAME } from '../store/constants';
import type { DemoData } from '../store/types';
import { RuleError } from '../store/rules';

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, storageKey: 'qh-auth' } });
  return client;
}

export class OfflineError extends RuleError {}

const NET = 'Keine Verbindung zum Server. Bitte prüfe das Internet und versuche es nochmal.';
function wrap(err: { message?: string; code?: string } | null | undefined): never | void {
  if (!err) return;
  const m = err.message ?? '';
  if (/fetch|network|Failed to fetch|Load failed/i.test(m) || !navigator.onLine) throw new OfflineError(NET);
  if (/JWT|not authenticated|Nicht angemeldet/i.test(m)) throw new RuleError('Bitte melde dich neu an.');
  throw new RuleError(m.replace(/^.*?: /, '') || 'Das hat leider nicht geklappt.');
}

export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  let res;
  try { res = await sb().rpc(fn, args); } catch { throw new OfflineError(NET); }
  wrap(res.error);
  return res.data as T;
}

/** Anmelden mit Name + Passwort (intern: <name>.6c@schule.quickhw.app). */
export async function signIn(name: string, password: string): Promise<'ok' | 'falsch'> {
  const clean = name.trim().replace(/^frau\s+/i, '');
  const email = await rpc<string>('qh_login_email', { p_class: CLASS_NAME, p_name: clean });
  let res;
  try { res = await sb().auth.signInWithPassword({ email, password }); } catch { throw new OfflineError(NET); }
  if (res.error) {
    if (/invalid login/i.test(res.error.message)) return 'falsch';
    wrap(res.error);
  }
  return 'ok';
}

export async function signOut() { try { await sb().auth.signOut({ scope: 'local' }); } catch { /* offline egal */ } }

export async function changeOwnPassword(name: string, oldPw: string, newPw: string) {
  if ((await signIn(name, oldPw)) === 'falsch') throw new RuleError('Das alte Passwort stimmt nicht.');
  const { error } = await sb().auth.updateUser({ password: newPw });
  wrap(error);
}

interface ServerState extends Omit<DemoData, 'gameSession'> {
  me: { id: string; role: 'kid' | 'teacher'; name: string };
  calendar: { monday: string; weekday: number; today: string };
  gameSession: (DemoData['gameSession'] & { serverNow: number }) | null;
}

/** Zustand vom Server holen und ins App-Format bringen. */
export async function fetchState(): Promise<{ data: DemoData; me: ServerState['me'] }> {
  const s = await rpc<ServerState>('qh_get_state');
  const gs = s.gameSession;
  const data: DemoData = {
    calendar: { monday: s.calendar.monday, weekday: s.calendar.weekday },
    students: s.students.map((x) => ({ ...x, photo: x.photo ?? undefined, isNew: x.isNew ?? undefined })),
    homeworks: s.homeworks.map((h) => ({ ...h, hausiTip: h.hausiTip ?? undefined })),
    submissions: s.submissions.map((x) => ({
      ...x, grading: x.grading ?? undefined, comment: x.comment ?? undefined, reward: x.reward ?? undefined,
      baseReward: x.baseReward ?? undefined, seenByStudent: x.seenByStudent ?? undefined, rewardUsed: x.rewardUsed ?? undefined,
    })),
    events: s.events.map((e) => ({ ...e, time: e.time ?? undefined, note: e.note ?? undefined })),
    settings: { ...({ coinsPerSubmission: 150, allowedGames: ['auto', 'bau', 'huepf', 'tor'], maxMinutes: 30, hausiTeacherCanRead: true, hausiSchoolTopicsOnly: true } as DemoData['settings']), ...s.settings },
    teacher: { ...s.teacher, photo: s.teacher.photo ?? undefined },
    garages: s.garages ?? {},
    chats: s.chats ?? {},
    buildCity: s.buildCity ?? {},
    // Startzeit auf die Uhr dieses Geräts umrechnen (Server-Uhr kann abweichen).
    gameSession: gs ? { submissionId: gs.submissionId, game: gs.game, startedAt: gs.startedAt - (gs.serverNow - Date.now()), skippedMs: gs.skippedMs } : undefined,
  };
  return { data, me: s.me };
}
