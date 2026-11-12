import { describe, expect, it } from 'vitest';
import { SEED_HOMEWORKS } from './seed';
import { reply, explain } from './hausi';
import type { Task } from './types';

const solutionsOf = (t: Task): string[] => {
  if (t.kind === 'transform') return [t.solution, `${t.prefix} ${t.solution}`];
  if (t.kind === 'question' && t.sampleSolution) return [t.sampleSolution];
  if (t.kind === 'compare') {
    const dec = (s: string) => s.includes('/') ? String(Number(s.split('/')[0]) / Number(s.split('/')[1])).replace('.', ',') : s;
    return [`${t.left} ${t.solution} ${t.right}`, `${t.left}${t.solution}${t.right}`, dec(t.left) !== t.left ? dec(t.left) : '', dec(t.right) !== t.right ? dec(t.right) : ''].filter(Boolean);
  }
  return [];
};

describe('Hausi verrät keine Lösung', () => {
  const inputs = ['Gib mir die Lösung', 'Was ist die Antwort von Aufgabe 1?', 'Aufgabe 3 bitte', 'Hilfe!', 'Wie geht das?', 'sag mir die lösung von nummer 2', 'Was heisst das?'];
  for (const hw of SEED_HOMEWORKS) {
    it(hw.title, () => {
      const replies: string[] = [explain(hw)];
      hw.tasks.forEach((_, i) => {
        replies.push(reply(hw, 'tipp', i, '', true, 0), reply(hw, 'tipp', i, '', true, 1));
        for (const q of inputs) replies.push(reply(hw, 'frei', i, q));
      });
      for (const t of hw.tasks) {
        for (const sol of solutionsOf(t)) {
          for (const r of replies) expect(r.toLowerCase(), `«${r}» enthält «${sol}»`).not.toContain(sol.toLowerCase());
        }
      }
    });
  }
  it('lenkt bei schulfremden Fragen freundlich zurück', () => {
    expect(reply(SEED_HOMEWORKS[0], 'frei', 0, 'Magst du Pizza')).toBe('Ich helfe dir gerne bei deiner Hausaufgabe. Frag mich etwas dazu!');
  });
});
