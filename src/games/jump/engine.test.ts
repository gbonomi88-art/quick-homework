import { describe, expect, it } from 'vitest';
import { advance, dxWrap, heightM, newJump, NO_UPGRADES, type JumpState } from './engine';
import { settle } from '../missions';
import { MISSIONS } from './meta';

/** Einfacher Bot: steuert zur nächsten Plattform oberhalb. */
function bot(s: JumpState) {
  // beim Steigen: nächste Plattform über der aktuellen Höhe; beim Fallen: die höchste darunter erreichbare
  const cands = s.platforms.filter((p) => p.broken === 0 && !(p.kind === 'cloud' && p.used) && p.kind !== 'crumble');
  const target = s.vy > 0
    ? cands.filter((p) => p.y > s.y - 0.2 && p.y < s.y + (s.vy * s.vy) / 52).sort((a, b) => b.y - a.y)[0]
    : cands.filter((p) => p.y < s.y).sort((a, b) => b.y - a.y)[0];
  if (!target) return 0;
  const d = dxWrap(target.x, s.x);
  return Math.abs(d) < 0.3 ? 0 : Math.sign(d);
}
function run(s: JumpState, secs: number, steer: (s: JumpState) => number, up = NO_UPGRADES) {
  let camBottom = -2;
  for (let t = 0; t < secs && !s.dead; t += 1 / 60) {
    advance(s, steer(s), 1 / 60, up, camBottom);
    camBottom = Math.max(camBottom, s.y - 6);
  }
}

describe('Hüpf-Held', () => {
  it('springt auf der Startwiese immer wieder hoch', () => {
    const s = newJump(NO_UPGRADES, 1);
    run(s, 3, () => 0);
    expect(s.dead).toBe(false);
    expect(s.y).toBeGreaterThanOrEqual(0);
  });
  it('Plattformen sind immer erreichbar', () => {
    const s = newJump(NO_UPGRADES, 7);
    run(s, 0.01, () => 0); s.maxY = 400; run(s, 0.01, () => 0); // erzeugt Plattformen bis 430
    const ys = s.platforms.map((p) => p.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeLessThanOrEqual(3.01);
  });
  it('ein geschickter Spieler kommt hoch und sammelt Sterne', () => {
    let best = 0, stars = 0;
    for (const seed of [3, 11, 42]) {
      const s = newJump(NO_UPGRADES, seed);
      run(s, 60, bot);
      best = Math.max(best, heightM(s)); stars += s.stars;
    }
    expect(best).toBeGreaterThan(100);
    expect(stars).toBeGreaterThan(3);
  });
  it('ohne Steuern fällt man irgendwann runter', () => {
    const s = newJump(NO_UPGRADES, 5);
    run(s, 120, () => 1);
    expect(s.dead).toBe(true);
  });
  it('Sprungfedern lassen höher springen, die Start-Rakete schiebt an', () => {
    const a = newJump(NO_UPGRADES, 9), b = newJump({ ...NO_UPGRADES, feder: 3 }, 9);
    run(a, 0.9, () => 0); run(b, 0.9, () => 0, { ...NO_UPGRADES, feder: 3 });
    expect(b.maxY).toBeGreaterThan(a.maxY);
    const r = newJump({ ...NO_UPGRADES, rakete: 1 }, 9);
    run(r, 1.5, () => 0, { ...NO_UPGRADES, rakete: 1 });
    expect(r.maxY).toBeGreaterThan(10);
  });
  it('Aufträge werden verbucht', () => {
    const m = { done: [], totals: {} };
    const { state, finished } = settle(MISSIONS, m, { height: 60, stars: 12, rounds: 1 });
    expect(finished.map((x) => x.id)).toEqual(['h50', 's10']);
    expect(state.totals.stars).toBe(12);
  });
});
