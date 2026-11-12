import { describe, expect, it } from 'vitest';
import { createSeed } from './seed';
import * as R from './rules';

const mattia = (d: ReturnType<typeof createSeed>) => d.students.find((s) => s.id === 'mattia')!;
const full = ['a', 'b', 'c', 'd'];

describe('§9.1 Spielgeld', () => {
  it('gibt beim Abgeben +coinsPerSubmission', () => {
    const d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', ['=', '>', '<', '<']);
    expect(mattia(d).coins).toBe(1050);
    expect(d.submissions.find((s) => s.id === 'sub-hw-mathe-mattia')!.status).toBe('abgegeben');
  });
  it('verdoppelt bei fehlerfreier Korrektur (Summe 300)', () => {
    let d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', ['=', '>', '<', '<']);
    d = R.gradeSubmission(d, 'sub-hw-mathe-mattia', [true, true, true, true], 'Super');
    expect(mattia(d).coins).toBe(1200);
    expect(d.submissions.find((s) => s.id === 'sub-hw-mathe-mattia')!.reward).toBe(300);
  });
  it('bleibt bei Fehlern beim einfachen Betrag', () => {
    let d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', full);
    d = R.gradeSubmission(d, 'sub-hw-mathe-mattia', [true, false, true, true], '');
    expect(mattia(d).coins).toBe(1050);
  });
  it('Bonus richtet sich nach dem Betrag beim Abgeben', () => {
    let d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', full);
    d = R.changeCoinsPerSubmission(d, 10);
    d = R.gradeSubmission(d, 'sub-hw-mathe-mattia', [true, true, true, true], '');
    expect(mattia(d).coins).toBe(1200);
  });
  it('erlaubt nur 10er-Schritte und Minimum 0', () => {
    let d = createSeed();
    d = R.changeCoinsPerSubmission(d, 10);
    expect(d.settings.coinsPerSubmission).toBe(160);
    for (let i = 0; i < 30; i++) d = R.changeCoinsPerSubmission(d, -10);
    expect(d.settings.coinsPerSubmission).toBe(0);
  });
  it('lässt unvollständige oder doppelte Abgaben nicht zu', () => {
    expect(() => R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', ['=', '', '<', '<'])).toThrow();
    const d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', full);
    expect(() => R.submitHomework(d, 'sub-hw-mathe-mattia', full)).toThrow();
  });
  it('Shop bringt den Kontostand nie unter 0', () => {
    let d = R.buy(createSeed(), 'mattia', 600);
    expect(mattia(d).coins).toBe(300);
    expect(() => R.buy(d, 'mattia', 450)).toThrow('Zu wenig Spielgeld');
    d = R.buy(d, 'mattia', 300);
    expect(mattia(d).coins).toBe(0);
  });
});

describe('§9.2 Nicht gemacht und Schulden', () => {
  it('1. Mal: Spiel gestrichen, kein Abzug', () => {
    const d = R.markNotDone(createSeed(), 'sub-hw-mathe-mattia');
    const m = mattia(d);
    expect(m.forgottenThisMonth).toBe(1);
    expect(m.skipNextGame).toBe(true);
    expect(m.coins).toBe(900);
    expect(R.lockReason(m)).toBe('gestrichen');
  });
  it('2. Mal im Monat: Abzug, bei ≤ 0 gesperrt', () => {
    let d = createSeed();
    d = { ...d, students: d.students.map((s) => (s.id === 'mattia' ? { ...s, coins: 100 } : s)) };
    d = R.markNotDone(d, 'sub-hw-mathe-mattia');
    d = R.markNotDone(d, 'sub-hw-franz-mattia');
    const m = mattia(d);
    expect(m.coins).toBe(-50);
    expect(m.lockedUntilPositive).toBe(true);
    expect(R.lockReason(m)).toBe('schulden');
  });
  it('2. Mal mit genug Spielgeld: Abzug, aber nicht gesperrt', () => {
    let d = R.markNotDone(createSeed(), 'sub-hw-mathe-mattia');
    d = R.markNotDone(d, 'sub-hw-franz-mattia');
    expect(mattia(d).coins).toBe(750);
    expect(mattia(d).lockedUntilPositive).toBe(false);
  });
  it('nur offene Hausaufgaben können „nicht gemacht“ werden', () => {
    const d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', full);
    expect(() => R.markNotDone(d, 'sub-hw-mathe-mattia')).toThrow();
  });
  it('skipNextGame gilt für genau eine Belohnung', () => {
    let d = R.markNotDone(createSeed(), 'sub-hw-mathe-mattia');
    d = R.submitHomework(d, 'sub-hw-franz-mattia', full);
    const first = R.claimReward(d, 'sub-hw-franz-mattia');
    expect(first.reason).toBe('gestrichen');
    expect(() => R.startGame(first.data, 'sub-hw-franz-mattia', 'tor', 0)).toThrow();
    d = R.submitHomework(first.data, 'sub-hw-deutsch-mattia', full);
    expect(R.claimReward(d, 'sub-hw-deutsch-mattia').reason).toBe('keine');
    expect(() => R.startGame(d, 'sub-hw-deutsch-mattia', 'tor', 0)).not.toThrow();
  });
  it('Sperre endet automatisch, sobald coins > 0', () => {
    let d = createSeed();
    d = { ...d, students: d.students.map((s) => (s.id === 'mattia' ? { ...s, coins: 100 } : s)) };
    d = R.markNotDone(d, 'sub-hw-mathe-mattia');
    d = R.markNotDone(d, 'sub-hw-franz-mattia'); // -50, gesperrt
    d = R.submitHomework(d, 'sub-hw-deutsch-mattia', full); // +150 → 100
    expect(mattia(d).coins).toBe(100);
    expect(mattia(d).lockedUntilPositive).toBe(false);
  });
});

describe('§9.3 Spielen', () => {
  it('erlaubt nur 1 Spiel pro Abgabe', () => {
    let d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', full);
    d = R.startGame(d, 'sub-hw-mathe-mattia', 'auto', 0);
    expect(() => R.startGame(d, 'sub-hw-mathe-mattia', 'tor', 0)).toThrow();
  });
  it('erlaubt nur freigegebene Spiele', () => {
    let d = R.submitHomework(createSeed(), 'sub-hw-mathe-mattia', full);
    d = { ...d, settings: { ...d.settings, allowedGames: ['bau'] } };
    expect(() => R.startGame(d, 'sub-hw-mathe-mattia', 'tor', 0)).toThrow('nicht erlaubt');
  });
});

describe('§9.4 Spiel-Timer', () => {
  const s = { startedAt: 0, skippedMs: 0 };
  it('läuft über echte Zeit', () => {
    expect(R.timeLeftMs(s, 30, 60_000)).toBe(29 * 60_000);
    expect(R.timeLeftMs(s, 30, 31 * 60_000)).toBe(0);
  });
  it('wechselt grün → orange (5 Min.) → rot (letzte Minute) → aus', () => {
    expect(R.timerPhase(6 * 60_000)).toBe('gruen');
    expect(R.timerPhase(5 * 60_000)).toBe('orange');
    expect(R.timerPhase(60_000)).toBe('rot');
    expect(R.timerPhase(0)).toBe('aus');
  });
  it('Spielzeit 5–30 in 5er-Schritten', () => {
    expect(R.setMaxMinutes(createSeed(), 2).settings.maxMinutes).toBe(5);
    expect(R.setMaxMinutes(createSeed(), 40).settings.maxMinutes).toBe(30);
    expect(R.setMaxMinutes(createSeed(), 17).settings.maxMinutes).toBe(15);
  });
});

describe('Vorprüfung', () => {
  it('prüft Zeichen, Umformungen und Musterlösungen', () => {
    expect(R.autoCheck({ kind: 'compare', left: '1/2', right: '0,5', solution: '=' }, '=')).toBe(true);
    expect(R.autoCheck({ kind: 'transform', word: 'er singt', prefix: 'er', solution: 'sang' }, ' Sang ')).toBe(true);
    expect(R.autoCheck({ kind: 'question', question: '4 × 12', sampleSolution: '48' }, '46')).toBe(false);
    expect(R.autoCheck({ kind: 'question', question: 'frei' }, 'egal')).toBeUndefined();
  });
});

describe('Shop-Artikel', () => {
  it('kauft mit festen Preisen und speichert die Garage', () => {
    let d = R.shop(createSeed(), 'mattia', 'car:renner');
    d = R.shop(d, 'mattia', 'tuning:turbo');
    expect(d.students.find((s) => s.id === 'mattia')!.coins).toBe(100);
    expect(d.garages.mattia.activeCar).toBe('renner');
    expect(() => R.shop(d, 'mattia', 'tuning:turbo')).toThrow('Schon eingebaut');
    expect(() => R.shop(d, 'mattia', 'car:gelaende')).toThrow('Zu wenig Spielgeld');
    d = R.shop(d, 'mattia', 'drive:flitzer');
    expect(d.garages.mattia.activeCar).toBe('flitzer');
    expect(() => R.shop(d, 'mattia', 'car:gratis')).toThrow('Unbekannter Artikel');
  });
});
