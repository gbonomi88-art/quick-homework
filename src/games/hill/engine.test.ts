import { describe, expect, it } from 'vitest';
import { advance, carSpec, carStats, distance, newCar, terrain } from './engine';

const sim = (garage: { activeCar: string; tuning: string[] }, secs: number, input = { gas: true, brake: false }) => {
  const spec = carSpec(garage); const s = newCar(spec);
  for (let t = 0; t < secs; t += 1 / 60) advance(s, spec, input, 1 / 60);
  return s;
};

describe('Gelände-Fahrspiel', () => {
  it('steht ohne Gas still und bleibt aufrecht', () => {
    const s = sim({ activeCar: 'flitzer', tuning: [] }, 3, { gas: false, brake: false });
    expect(s.crashed).toBe(false);
    expect(Math.abs(s.a)).toBeLessThan(0.05);
    expect(distance(s)).toBeLessThan(1);
  });
  it('fährt mit Gas vorwärts und sammelt Meter', () => {
    const s = sim({ activeCar: 'flitzer', tuning: [] }, 4);
    expect(distance(s)).toBeGreaterThan(20);
  });
  it('erkennt Umkippen (auf dem Dach)', () => {
    const spec = carSpec({ activeCar: 'flitzer', tuning: [] }); const s = newCar(spec);
    s.a = Math.PI; s.y = terrain(s.x) + 0.5;
    advance(s, spec, { gas: false, brake: false }, 1 / 60);
    expect(s.crashed).toBe(true);
  });
  it('Turbo macht schneller, Felgen geben Grip, Spoiler macht stabiler', () => {
    const base = carSpec({ activeCar: 'flitzer', tuning: [] });
    const all = carSpec({ activeCar: 'flitzer', tuning: ['turbo', 'felgen', 'spoiler'] });
    expect(all.power).toBeGreaterThan(base.power);
    expect(all.maxSpeed).toBeGreaterThan(base.maxSpeed);
    expect(all.grip).toBeGreaterThan(base.grip);
    expect(all.airDamp).toBeGreaterThan(base.airDamp);
    const a = carStats({ activeCar: 'flitzer', tuning: [] }), b = carStats({ activeCar: 'flitzer', tuning: ['turbo'] });
    expect(b.tempo).toBeGreaterThan(a.tempo);
  });
  it('Rennwagen ist auf der Geraden schneller als der Mini-Bus', () => {
    const r = sim({ activeCar: 'renner', tuning: [] }, 2.5), b = sim({ activeCar: 'bus', tuning: [] }, 2.5);
    expect(r.x).toBeGreaterThan(b.x);
  });
  it('alle Autos kommen mit Vollgas über die ersten Hügel', () => {
    for (const car of ['flitzer', 'bus', 'gelaende', 'renner']) {
      const s = sim({ activeCar: car, tuning: [] }, 6);
      expect(distance(s), car).toBeGreaterThan(30);
    }
  });
});
