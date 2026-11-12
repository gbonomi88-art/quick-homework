import { describe, expect, it } from 'vitest';
import { build, canBuild, collect, demolish, loadCity, startCity, stats, tick, upgrade, welcomeBack, type City } from './model';

const at = (x: number, y: number) => y * 10 + x;
function rich(): City { return { ...startCity(), money: 10000 }; }

describe('Baumeister', () => {
  it('Startstadt: ein Haus an der Strasse bringt Einwohner und Steuern', () => {
    const c = startCity();
    const s = stats(c);
    expect(s.pop).toBeGreaterThan(0);
    const t = tick(c, 10);
    expect(t.money).toBeGreaterThan(c.money);
  });
  it('ohne Strasse arbeitet ein Haus nicht', () => {
    let c = rich();
    const before = stats(c).pop;
    c = build(c, 'house', at(5, 5)); // weit weg von der Strasse (Reihe 2)
    expect(stats(c).pop).toBe(before);
    expect(stats(c).unconnected).toBe(1);
    c = build(c, 'road', at(5, 4)); c = build(c, 'road', at(5, 3));
    expect(stats(c).pop).toBeGreaterThan(before);
  });
  it('Gebäude sind bis zur Einwohnerzahl gesperrt und kosten Geld', () => {
    const c = startCity();
    expect(canBuild(c, 'factory', at(0, 3))).toBe('gesperrt');
    expect(canBuild({ ...c, money: 0 }, 'house', at(0, 3))).toBe('geld');
    expect(canBuild(c, 'house', at(1, 2))).toBe('besetzt');
  });
  it('Läden füllen sich, wenn Arbeiter da sind, und werden eingesammelt', () => {
    let c = rich();
    for (const x of [0, 2, 3, 4]) c = build(c, 'house', at(x, 1));
    c = build(c, 'shop', at(5, 3));
    const s = stats(c);
    expect(s.pop).toBeGreaterThanOrEqual(8);
    c = tick(c, 20);
    expect(c.cells[at(5, 3)]!.c).toBeGreaterThan(5);
    const { city, gained } = collect(c, at(5, 3));
    expect(gained).toBeGreaterThan(5); expect(city.money).toBe(c.money + gained);
    // voll nach 45 s
    const full = tick(city, 600);
    expect(full.cells[at(5, 3)]!.c).toBeLessThanOrEqual(s.prodPerSec[at(5, 3)] * 45 + 0.01);
  });
  it('Ausbauen erhöht Einwohner, Bäume machen glücklich, Abreissen gibt Geld zurück', () => {
    let c = rich();
    const p1 = stats(c).pop;
    c = upgrade(c, at(2, 1));
    expect(stats(c).pop).toBeGreaterThan(p1);
    const p2 = stats(c).pop;
    c = build(c, 'tree', at(1, 1)); c = build(c, 'tree', at(3, 1)); c = build(c, 'tree', at(2, 0));
    expect(stats(c).pop).toBeGreaterThan(p2);
    const m = c.money;
    c = demolish(c, at(2, 1));
    expect(c.money).toBe(m + Math.floor((15 + 40) / 2));
  });
  it('Willkommen zurück: höchstens 20 Minuten Steuern', () => {
    const c = { ...startCity(), last: 0 };
    const { gained } = welcomeBack(c, 10 * 3600 * 1000);
    expect(gained).toBe(Math.floor(stats(c).taxPerSec * 1200));
  });
  it('alte Stadt wird übernommen', () => {
    const old = Array(60).fill(''); old[0] = 'house'; old[1] = 'road';
    const c = loadCity(undefined, old);
    expect(c.cells[0]?.t).toBe('house'); expect(c.cells[1]?.t).toBe('road'); expect(c.money).toBe(60);
  });
});
