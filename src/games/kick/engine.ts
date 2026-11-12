/**
 * Torschuss: Wisch-Elfmeter in Pseudo-3D. Tor bei z = 0 (7,32 × 2,44 m), Ball bei z = 11.
 * Wischen bestimmt Richtung, Höhe, Tempo und Effet. Der Torhüter reagiert nach Level.
 */
export const GOAL_W = 3.66, GOAL_H = 2.44, SPOT = 11, POST = 0.11;
export const WALL_Z = SPOT - 9.15;

export interface KickUpgrades { praezision: number; kraft: number; effet: number; extra: number }
export const NO_KICK_UP: KickUpgrades = { praezision: 0, kraft: 0, effet: 0, extra: 0 };

export interface Shot { aimX: number; aimY: number; speed: number; curve: number; loft: number }
export interface Target { x: number; y: number; r: number; vx: number }
export interface Wall { x: number; n: number; h: number; jump: number }
export interface Keeper { x: number; y: number; vx: number; vy: number; goal: number; react: number; speed: number; err: number; lean: number; saved: boolean }

export type Outcome = 'tor' | 'gehalten' | 'daneben' | 'drueber' | 'pfosten' | 'mauer';

export interface Flight { shot: Shot; t: number; T: number; x: number; y: number; z: number; done: boolean; outcome?: Outcome; fx: number; fy: number; bounce: number; targetHit: boolean }

export interface KickState {
  level: number; goals: number; shots: number; streak: number; bestStreak: number; lives: number; points: number;
  targets: number; corners: number; coins: number; curls: number;
  keeper: Keeper; wall: Wall | null; target: Target | null; flight: Flight | null; seed: number; over: boolean;
  last: { outcome: Outcome; gained: number; text: string } | null;
}

function rnd(s: { seed: number }) { s.seed = (s.seed * 1664525 + 1013904223) % 4294967296; return s.seed / 4294967296; }
function gauss(s: { seed: number }) { return (rnd(s) + rnd(s) + rnd(s) - 1.5) * 1.15; }

export function keeperFor(level: number): Keeper {
  return { x: 0, y: 0, vx: 0, vy: 0, goal: 0, lean: 0, saved: false,
    react: Math.max(0.07, 0.3 - level * 0.025), speed: Math.min(8, 4.2 + level * 0.4), err: Math.max(0.12, 0.95 - level * 0.09) };
}

export function newKick(up: KickUpgrades = NO_KICK_UP, seed = Date.now() % 100000): KickState {
  const s: KickState = { level: 1, goals: 0, shots: 0, streak: 0, bestStreak: 0, lives: 3 + up.extra, points: 0, targets: 0, corners: 0, coins: 0, curls: 0,
    keeper: keeperFor(1), wall: null, target: null, flight: null, seed, over: false, last: null };
  setupRound(s);
  return s;
}

/** Hindernisse für den nächsten Schuss je nach Level. */
export function setupRound(s: KickState) {
  s.keeper = keeperFor(s.level);
  s.flight = null;
  s.target = s.level >= 2 && rnd(s) < 0.75
    ? { x: (rnd(s) * 2 - 1) * (GOAL_W - 0.8), y: 0.6 + rnd(s) * (GOAL_H - 1.1), r: Math.max(0.38, 0.6 - s.level * 0.02), vx: s.level >= 4 ? (rnd(s) < 0.5 ? -1 : 1) * (0.8 + s.level * 0.1) : 0 }
    : null;
  s.wall = s.level >= 3 && rnd(s) < 0.6
    ? { x: (rnd(s) < 0.5 ? -1 : 1) * (0.6 + rnd(s) * 1.6), n: Math.min(5, 2 + Math.floor(s.level / 3)), h: 1.85, jump: s.level >= 6 ? 0.35 : 0 }
    : null;
}

/** Wischgeste → Schuss. dx, dy in Bildschirmhöhen (dy > 0 = nach oben), dur in s, bend = seitliche Ausbuchtung der Geste. */
export function shotFromSwipe(dx: number, dy: number, dur: number, bend: number, up: KickUpgrades = NO_KICK_UP): Shot {
  const len = Math.hypot(dx, dy);
  const v = len / Math.max(0.05, dur);
  const speed = Math.max(13, Math.min(31, 13 + v * 7)) * (1 + up.kraft * 0.06);
  return {
    aimX: dx * 15, aimY: Math.max(0, dy * 6.2 - 0.5),
    speed, curve: Math.max(-2.6, Math.min(2.6, bend * 9 * (1 + up.effet * 0.3))), loft: Math.max(0, (22 - speed) * 0.07),
  };
}
/** Tippen/Tastatur: Schuss genau auf einen Punkt im Tor (mittleres Tempo). */
export const shotAt = (x: number, y: number, up: KickUpgrades = NO_KICK_UP): Shot => ({ aimX: x, aimY: y, speed: 19 * (1 + up.kraft * 0.06), curve: 0, loft: 0.2 });

export function kick(s: KickState, shot: Shot, up: KickUpgrades = NO_KICK_UP) {
  // Streuung: schnelle Schüsse sind ungenauer, Präzision hilft
  const spread = Math.max(0.05, 0.14 + Math.max(0, shot.speed - 21) * 0.045 - up.praezision * 0.05);
  const fx = shot.aimX + gauss(s) * spread, fy = Math.max(0, shot.aimY + gauss(s) * spread * 0.7);
  s.flight = { shot, t: 0, T: SPOT / shot.speed, x: 0, y: 0.11, z: SPOT, done: false, fx, fy, bounce: 0, targetHit: false };
  s.shots++;
  s.keeper.err = gauss(s) * s.keeper.err;
}

/** Ballposition bei Anteil u (0 = Elfmeterpunkt, 1 = Torlinie). */
export function ballAt(f: Flight, u: number) {
  const b = 4 * u * (1 - u);
  return { x: f.fx * u + f.shot.curve * b, y: 0.11 + (f.fy - 0.11) * u + f.shot.loft * b, z: SPOT * (1 - u) };
}

const evt = (s: KickState, outcome: Outcome, gained: number, text: string) => { s.last = { outcome, gained, text }; };

export function step(s: KickState, dt: number) {
  const f = s.flight;
  const k = s.keeper;
  if (s.target && s.target.vx) {
    s.target.x += s.target.vx * dt;
    const lim = GOAL_W - s.target.r - 0.1;
    if (Math.abs(s.target.x) > lim) { s.target.x = Math.sign(s.target.x) * lim; s.target.vx = -s.target.vx; }
  }
  if (!f) return;
  if (f.done) {
    // Ball rollt/fällt aus, Torhüter landet
    f.bounce += dt;
    if (f.outcome === 'tor') { f.z = Math.max(-1.6, f.z - dt * 6); f.y = Math.max(0.11, f.y - dt * 3); }
    else if (f.outcome === 'gehalten') { f.z += dt * 4; f.y = Math.max(0.11, f.y - dt * 4); f.x += Math.sign(f.x || 1) * dt * 2; }
    else { f.z -= dt * 6; f.y = Math.max(0.11, f.y - dt * 3); }
    k.vy -= 14 * dt; k.y = Math.max(0, k.y + k.vy * dt); k.x = Math.max(-GOAL_W - 0.3, Math.min(GOAL_W + 0.3, k.x + k.vx * dt * 0.3));
    return;
  }
  f.t += dt;
  const u = Math.min(1, f.t / f.T);
  const prev = { x: f.x, y: f.y, z: f.z };
  Object.assign(f, ballAt(f, u));
  // Torhüter: schätzt aus der aktuellen Flugrichtung, wo der Ball ankommt
  if (f.t > k.react) {
    const vz = (prev.z - f.z) || 1e-6;
    const remain = f.z / vz;
    const px = f.x + (f.x - prev.x) * remain + k.err, py = f.y + (f.y - prev.y) * remain;
    k.goal = Math.max(-GOAL_W, Math.min(GOAL_W, px));
    const d = k.goal - k.x;
    k.vx = Math.sign(d) * Math.min(Math.abs(d) / dt, k.speed);
    k.x += k.vx * dt;
    if (Math.abs(d) > 0.9 && k.y === 0 && py > 0.6) k.vy = Math.min(4.5, 1.8 + py * 1.1);
    if (k.vy || k.y) { k.vy -= 14 * dt; k.y = Math.max(0, k.y + k.vy * dt); if (k.y === 0) k.vy = 0; }
    k.lean = Math.max(-1.3, Math.min(1.3, (k.goal - k.x) * 1.2 + Math.sign(k.vx) * Math.min(1, Math.abs(k.vx) / 4)));
  }
  // Mauer
  const w = s.wall;
  if (w && prev.z > WALL_Z && f.z <= WALL_Z) {
    const half = w.n * 0.3;
    if (Math.abs(f.x - w.x) < half + 0.12 && f.y < w.h + w.jump + 0.12) return finish(s, 'mauer');
  }
  if (u >= 1) {
    const ax = Math.abs(f.x);
    const reach = 0.95 - Math.max(0, f.y - 1.5 - k.y) * 0.45;
    const kTop = 1.9 + k.y + 0.4;
    if (Math.abs(f.x - k.x) < reach && f.y < kTop && f.y > k.y - 0.3) return finish(s, 'gehalten');
    if ((Math.abs(ax - GOAL_W) < POST && f.y < GOAL_H + POST) || (Math.abs(f.y - GOAL_H) < POST && ax < GOAL_W + POST)) return finish(s, 'pfosten');
    if (ax > GOAL_W) return finish(s, 'daneben');
    if (f.y > GOAL_H) return finish(s, 'drueber');
    return finish(s, 'tor');
  }
}

function finish(s: KickState, outcome: Outcome) {
  const f = s.flight!;
  f.done = true; f.outcome = outcome;
  if (outcome === 'gehalten') { s.keeper.saved = true; }
  if (outcome !== 'tor') {
    s.streak = 0; s.lives--;
    const text = { gehalten: 'Gehalten!', daneben: 'Daneben!', drueber: 'Drüber!', pfosten: 'Pfosten!', mauer: 'In die Mauer!' }[outcome];
    evt(s, outcome, 0, text);
    if (s.lives <= 0) s.over = true;
    return;
  }
  s.goals++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
  const mult = Math.min(5, s.streak);
  let gained = 100 * mult, text = mult > 1 ? `Toooor! ×${mult}` : 'Toooor!';
  let coins = 1;
  const corner = Math.abs(f.x) > GOAL_W - 0.9 || f.y > GOAL_H - 0.6;
  if (corner) { gained += 50; s.corners++; text += ' Ecke +50'; }
  if (Math.abs(f.shot.curve) > 1) s.curls++;
  const t = s.target;
  if (t && Math.hypot(f.x - t.x, f.y - t.y) < t.r + 0.11) { gained += 150; s.targets++; f.targetHit = true; coins += 2; text = `Volltreffer! +${gained}`; }
  s.points += gained; s.coins += coins;
  if (s.goals % 4 === 0) { s.level++; text += ` · Level ${s.level}`; if (s.goals % 8 === 0) s.lives = Math.min(5, s.lives + 1); }
  evt(s, 'tor', gained, text);
}

export function advance(s: KickState, dt: number) {
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  for (let i = 0; i < n; i++) step(s, dt / n);
}
