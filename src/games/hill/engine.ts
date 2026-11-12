/**
 * Gelände-Fahrspiel: einfache 2D-Physik (y zeigt nach oben, Einheiten in Metern).
 * Auto = starrer Körper mit zwei gefederten Rad-Kontakten. Rein funktional testbar, ohne DOM.
 */
import type { Garage } from '../../store/types';

export interface CarSpec {
  name: string;
  power: number;      // Antrieb (m/s²)
  maxSpeed: number;   // m/s
  grip: number;       // Reibung Rad/Boden
  wheelR: number;     // Radradius (m)
  base: number;       // halber Radstand (m)
  inertia: number;    // Trägheit (je höher, desto weniger kippelig)
  airControl: number; // Drehen in der Luft (rad/s²)
  airDamp: number;    // Beruhigung in der Luft
  springK: number;
  springC: number;
}

const CARS: Record<string, Omit<CarSpec, 'name'> & { name: string }> = {
  flitzer: { name: 'Stadtflitzer', power: 7, maxSpeed: 13, grip: 1.0, wheelR: 0.36, base: 1.0, inertia: 0.55, airControl: 5.5, airDamp: 0.3, springK: 110, springC: 9 },
  bus: { name: 'Mini-Bus', power: 6.2, maxSpeed: 12, grip: 1.05, wheelR: 0.4, base: 1.25, inertia: 1.05, airControl: 4, airDamp: 0.6, springK: 120, springC: 11 },
  gelaende: { name: 'Geländewagen', power: 7.5, maxSpeed: 13.5, grip: 1.35, wheelR: 0.5, base: 1.05, inertia: 0.7, airControl: 5, airDamp: 0.4, springK: 85, springC: 8 },
  renner: { name: 'Rennwagen', power: 10, maxSpeed: 19, grip: 0.95, wheelR: 0.33, base: 1.2, inertia: 0.42, airControl: 6.5, airDamp: 0.2, springK: 140, springC: 9 },
};

/** Werte aus Auto + Tuning (Felgen, Spoiler, Turbo) – die Käufe im Shop wirken hier. */
export function carSpec(g: Pick<Garage, 'activeCar' | 'tuning'>): CarSpec {
  const c = { ...(CARS[g.activeCar] ?? CARS.flitzer) };
  if (g.tuning.includes('felgen')) c.grip += 0.25;
  if (g.tuning.includes('spoiler')) { c.airDamp += 0.9; c.inertia += 0.15; }
  if (g.tuning.includes('turbo')) { c.power *= 1.35; c.maxSpeed += 4; }
  return c;
}

/** Werte 1–5 für die Anzeige im Shop. */
export function carStats(g: Pick<Garage, 'activeCar' | 'tuning'>) {
  const c = carSpec(g);
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  return {
    tempo: clamp((c.maxSpeed - 9) / 2.4),
    kraft: clamp((c.power - 4.5) / 1.4),
    grip: clamp((c.grip - 0.75) / 0.17),
    stabil: clamp((c.inertia + c.airDamp * 0.4 - 0.3) / 0.22),
  };
}

// ---------- Gelände ----------
/** Höhe des Bodens bei x (Meter). Erst flach, dann immer höhere Hügel und Schanzen. */
export function terrain(x: number): number {
  if (x < 12) return 0;
  const t = x - 12;
  const ramp = Math.min(1, t / 120);            // langsam schwieriger
  const hard = Math.min(1, Math.max(0, (t - 150) / 400));
  let h = 1.6 * ramp * Math.sin(t * 0.09) + 0.9 * ramp * Math.sin(t * 0.23 + 1.3)
    + (0.5 + 1.6 * hard) * Math.sin(t * 0.041 + 0.4) * ramp + (0.25 + 0.5 * hard) * Math.sin(t * 0.57 + 2.1) * ramp;
  // Sprungschanzen alle 90 m (ab 60 m)
  const k = t - 60;
  if (k > 0) {
    const p = k % 90;
    if (p < 9) h += (p / 9) ** 2 * (1.6 + hard * 1.2);
    else if (p < 10) h += (1 - (p - 9)) * (1.6 + hard * 1.2);
  }
  return h;
}
export const slope = (x: number) => (terrain(x + 0.05) - terrain(x - 0.05)) / 0.1;

export const STAR_EVERY = 40;
export const starX = (i: number) => 30 + i * STAR_EVERY;

// ---------- Zustand ----------
export interface CarState {
  x: number; y: number; vx: number; vy: number; a: number; w: number;
  spin: number;            // Rad-Drehung (für die Grafik)
  contact: [boolean, boolean];
  crashed: boolean;
  maxX: number;
  air: number;             // Sekunden in der Luft
  airRot: number;          // Drehung in der Luft (für Salto)
  stars: number; nextStar: number;
  bonus: number;           // Bonus-Punkte (Sterne, Sprünge, Saltos)
  events: { text: string; t: number }[];
  time: number;
}

export function newCar(spec: CarSpec): CarState {
  return { x: 3, y: spec.wheelR + 0.45, vx: 0, vy: 0, a: 0, w: 0, spin: 0, contact: [false, false], crashed: false, maxX: 3,
    air: 0, airRot: 0, stars: 0, nextStar: 0, bonus: 0, events: [], time: 0 };
}

export const distance = (s: CarState) => Math.max(0, Math.floor(s.maxX - 3));
export const points = (s: CarState) => distance(s) + s.bonus;

const H = 0.32; // Rad-Aufhängung unter dem Schwerpunkt (m)
const HEAD = 0.62; // Dach über dem Schwerpunkt (m)

/** Punkt im Auto (lokal lx, ly) in Weltkoordinaten. */
export function toWorld(s: CarState, lx: number, ly: number) {
  const c = Math.cos(s.a), si = Math.sin(s.a);
  return { x: s.x + lx * c - ly * si, y: s.y + lx * si + ly * c };
}

export interface Input { gas: boolean; brake: boolean }

/** Ein Physik-Schritt (dt in Sekunden, klein halten: 1/240). */
export function step(s: CarState, spec: CarSpec, input: Input, dt: number): void {
  if (s.crashed) input = { gas: false, brake: false }; // nach dem Umkippen weiter rollen lassen, ohne Antrieb
  s.time += dt;
  let fx = 0, fy = -9.8, tq = 0;
  const contacts: [boolean, boolean] = [false, false];
  const pts: [number, number][] = [[-spec.base, -H], [spec.base, -H]];
  pts.forEach(([lx, ly], i) => {
    const wc = toWorld(s, lx, ly);
    const g = terrain(wc.x), m = slope(wc.x);
    const nl = Math.hypot(-m, 1); const n = { x: -m / nl, y: 1 / nl }; const t = { x: n.y, y: -n.x };
    const gap = (wc.y - g) * n.y; // Abstand Radmitte → Boden entlang der Normalen
    const depth = spec.wheelR - gap;
    if (depth <= 0) return;
    contacts[i] = true;
    const rx = wc.x - s.x, ry = wc.y - s.y;
    const pvx = s.vx - s.w * ry, pvy = s.vy + s.w * rx;
    const vn = pvx * n.x + pvy * n.y, vt = pvx * t.x + pvy * t.y;
    const Fn = Math.max(0, spec.springK * depth - spec.springC * vn) / 2;
    // Antrieb (Allrad) bzw. Bremse/Rückwärts
    let drive = 0;
    if (input.gas) drive = spec.power * Math.max(0, 1 - vt / spec.maxSpeed) / 2;
    else if (input.brake) drive = vt > 0.6 ? -spec.power * 1.2 / 2 : -spec.power * 0.5 * Math.max(0, 1 + vt / 5) / 2;
    let Ft = drive - vt * 0.06; // Rollwiderstand
    const lim = spec.grip * Fn * 1.4;
    Ft = Math.max(-lim, Math.min(lim, Ft));
    const Fx = n.x * Fn + t.x * Ft, Fy = n.y * Fn + t.y * Ft;
    fx += Fx; fy += Fy; tq += rx * Fy - ry * Fx;
  });
  // Karosserie und Dach dürfen nicht im Boden versinken (harte Kontakte)
  for (const [lx, ly] of [[-spec.base * 1.25, -0.05], [spec.base * 1.25, -0.05], [-spec.base * 0.9, HEAD * 0.8], [spec.base * 0.6, HEAD], [0, HEAD]] as const) {
    const p = toWorld(s, lx, ly);
    const d = terrain(p.x) - p.y;
    if (d > 0) {
      const rx = p.x - s.x, ry = p.y - s.y;
      const pvy = s.vy + s.w * rx;
      const F = 260 * d - 14 * Math.min(0, pvy);
      fy += F; tq += rx * F; fx -= (s.vx - s.w * ry) * (s.crashed ? 6 : 2);
    }
  }
  const grounded = contacts[0] || contacts[1];
  if (!grounded) {
    if (input.gas) tq += spec.airControl * spec.inertia;   // Nase hoch
    if (input.brake) tq -= spec.airControl * spec.inertia; // Nase runter
    tq -= s.w * spec.airDamp * spec.inertia;
  }
  s.vx += fx * dt; s.vy += fy * dt;
  s.w += (tq / spec.inertia) * dt;
  s.w *= 1 - 0.25 * dt;
  s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.w * dt;
  const vt = s.vx * Math.cos(s.a) + s.vy * Math.sin(s.a);
  s.spin -= (vt / spec.wheelR) * dt;
  s.maxX = Math.max(s.maxX, s.x);

  // Luftsprünge und Saltos
  if (!grounded) { s.air += dt; s.airRot += s.w * dt; }
  else {
    if (s.air > 0.7) {
      const b = Math.round(s.air * 12);
      s.bonus += b; s.events.push({ text: `Luftsprung! +${b}`, t: s.time });
    }
    const flips = Math.floor(Math.abs(s.airRot) / (Math.PI * 2) + 0.15);
    if (flips > 0 && s.air > 0.5) { s.bonus += 50 * flips; s.events.push({ text: flips > 1 ? `${flips}× Salto! +${50 * flips}` : 'Salto! +50', t: s.time }); }
    s.air = 0; s.airRot = 0;
  }
  contacts.forEach((c, i) => { s.contact[i] = c; });

  // Sterne einsammeln
  const sx = starX(s.nextStar);
  if (s.x > sx + 2) s.nextStar++;
  else if (Math.abs(s.x - sx) < 1.2 && Math.abs(s.y - (terrain(sx) + 1.6)) < 1.6) {
    s.stars++; s.bonus += 25; s.nextStar++; s.events.push({ text: 'Stern! +25', t: s.time });
  }

  // Umgekippt? Dach berührt den Boden oder Auto liegt auf dem Kopf.
  const head = toWorld(s, 0, HEAD);
  if (!s.crashed && (head.y < terrain(head.x) + 0.12 || (Math.cos(s.a) < -0.3 && s.y - terrain(s.x) < 1.0))) {
    s.crashed = true;
  }
  if (s.events.length > 6) s.events.splice(0, s.events.length - 6);
}

/** Mehrere kleine Schritte für eine Frame-Zeit. */
export function advance(s: CarState, spec: CarSpec, input: Input, frameDt: number) {
  const n = Math.min(40, Math.ceil(Math.min(frameDt, 0.1) / (1 / 240)));
  for (let i = 0; i < n; i++) step(s, spec, input, Math.min(frameDt, 0.1) / n);
}
