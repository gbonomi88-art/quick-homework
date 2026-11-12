import { describe, expect, it } from 'vitest';
import { advance, kick, newKick, NO_KICK_UP, shotAt, shotFromSwipe, type KickState, type Shot } from './engine';

function play(s: KickState, shot: Shot, up = NO_KICK_UP) {
  kick(s, shot, up);
  for (let i = 0; i < 200 && !s.flight!.done; i++) advance(s, 1 / 60);
  return s.flight!.outcome;
}

describe('Torschuss', () => {
  it('Schuss genau auf den Torhüter wird gehalten', () => {
    const s = newKick(NO_KICK_UP, 1);
    expect(play(s, shotAt(0, 1))).toBe('gehalten');
    expect(s.lives).toBe(2);
  });
  it('Schuss in die Ecke ist ein Tor und gibt Punkte', () => {
    let goals = 0;
    for (let seed = 1; seed <= 20; seed++) { const s = newKick(NO_KICK_UP, seed); if (play(s, shotAt(2.9, 0.5)) === 'tor') goals++; }
    expect(goals).toBeGreaterThanOrEqual(16);
  });
  it('zu hoch oder zu weit daneben geht nicht rein', () => {
    expect(play(newKick(NO_KICK_UP, 2), shotAt(0, 3.5))).toBe('drueber');
    expect(play(newKick(NO_KICK_UP, 2), shotAt(5, 1))).toBe('daneben');
  });
  it('Wischen: nach rechts oben ergibt einen Schuss rechts hoch', () => {
    const sh = shotFromSwipe(0.18, 0.35, 0.25, 0);
    expect(sh.aimX).toBeGreaterThan(2); expect(sh.aimY).toBeGreaterThan(1); expect(sh.speed).toBeGreaterThan(18);
    expect(shotFromSwipe(0, 0.3, 0.2, 0.1).curve).toBeGreaterThan(0);
  });
  it('Serie multipliziert Punkte, Level steigt nach 4 Toren, 3 Fehlschüsse beenden das Spiel', () => {
    const s = newKick(NO_KICK_UP, 3);
    s.wall = null; s.target = null;
    for (let i = 0; i < 4; i++) { s.wall = null; s.target = null; s.flight = null; play(s, shotAt(i % 2 ? 3 : -3, 0.4)); }
    expect(s.goals).toBe(4); expect(s.level).toBe(2);
    expect(s.points).toBeGreaterThanOrEqual(100 + 200 + 300 + 400);
    for (let i = 0; i < 3; i++) { s.flight = null; play(s, shotAt(6, 1)); }
    expect(s.over).toBe(true);
  });
  it('Die Mauer blockt flache Schüsse, Präzision verringert die Streuung', () => {
    const s = newKick(NO_KICK_UP, 4); s.wall = { x: 0, n: 4, h: 1.85, jump: 0 };
    expect(play(s, shotAt(0.3, 0.5))).toBe('mauer');
    const spread = (p: number) => { let sum = 0; for (let i = 1; i < 40; i++) { const k = newKick(NO_KICK_UP, i); kick(k, { ...shotAt(1, 1), speed: 29 }, { ...NO_KICK_UP, praezision: p }); sum += Math.abs(k.flight!.fx - 1); } return sum; };
    expect(spread(3)).toBeLessThan(spread(0));
  });
});
