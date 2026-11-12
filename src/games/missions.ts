/** Aufträge: immer 3 aktive Ziele pro Spiel. Erledigt = Belohnung, dann rückt das nächste nach. */
export interface Mission { id: string; text: string; key: string; target: number; scope: 'round' | 'total'; reward: number }
export interface MissionState { done: string[]; totals: Record<string, number> }

export const emptyMissions = (): MissionState => ({ done: [], totals: {} });

export function active(list: Mission[], m: MissionState, n = 3): Mission[] {
  return list.filter((x) => !m.done.includes(x.id)).slice(0, n);
}

export function progressOf(x: Mission, m: MissionState, round: Record<string, number> = {}): number {
  return x.scope === 'total' ? (m.totals[x.key] ?? 0) : (round[x.key] ?? 0);
}

/** Runde verbuchen. Gibt erledigte Aufträge zurück (Belohnung wird vom Aufrufer gutgeschrieben). */
export function settle(list: Mission[], m: MissionState, round: Record<string, number>): { state: MissionState; finished: Mission[] } {
  const totals = { ...m.totals };
  for (const [k, v] of Object.entries(round)) totals[k] = (totals[k] ?? 0) + v;
  const state = { done: [...m.done], totals };
  const finished = active(list, m).filter((x) => progressOf(x, state, round) >= x.target);
  state.done.push(...finished.map((x) => x.id));
  return { state, finished };
}
