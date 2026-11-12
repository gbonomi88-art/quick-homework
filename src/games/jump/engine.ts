/**
 * Hüpf-Held: endloser Himmels-Springer. Welt 10 Einheiten breit, y nach oben.
 * Die Figur springt automatisch, wenn sie von oben auf eine Plattform fällt.
 */
export const WORLD_W = 10;
const G = 26;
const JUMP = 13.2;
const SPRING = 21;
const ROCKET_V = 17;

export type PlatformKind = 'normal' | 'move' | 'crumble' | 'cloud';
export interface Platform { id: number; x: number; y: number; w: number; kind: PlatformKind; vx: number; spring: boolean; broken: number; used: boolean }
export interface Item { id: number; x: number; y: number; kind: 'star' | 'rocket' | 'shield'; taken: boolean }
export interface Enemy { id: number; x: number; y: number; vx: number; dead: number }

export interface JumpUpgrades { feder: number; magnet: number; rakete: number; schild: number }
export const NO_UPGRADES: JumpUpgrades = { feder: 0, magnet: 0, rakete: 0, schild: 0 };

export interface JumpState {
  x: number; y: number; vx: number; vy: number;
  maxY: number; stars: number; stomps: number; rockets: number;
  rocket: number; shield: boolean; dead: boolean; face: 1 | -1; squash: number;
  platforms: Platform[]; items: Item[]; enemies: Enemy[];
  genY: number; nextId: number; seed: number; time: number;
  events: { text: string; t: number }[];
}

/** Kleiner deterministischer Zufall (für Tests reproduzierbar). */
function rnd(s: JumpState) { s.seed = (s.seed * 1664525 + 1013904223) % 4294967296; return s.seed / 4294967296; }

export const heightM = (s: JumpState) => Math.floor(s.maxY * 2);
export const score = (s: JumpState) => heightM(s) + s.stars * 5 + s.stomps * 25;

export function newJump(up: JumpUpgrades = NO_UPGRADES, seed = Date.now() % 100000): JumpState {
  const s: JumpState = {
    x: WORLD_W / 2, y: 0.6, vx: 0, vy: 0, maxY: 0, stars: 0, stomps: 0, rockets: 0,
    rocket: up.rakete ? 1.4 + up.rakete * 0.8 : 0, shield: up.schild > 0, dead: false, face: 1, squash: 0,
    platforms: [], items: [], enemies: [], genY: 0, nextId: 1, seed, time: 0, events: [],
  };
  s.platforms.push({ id: 0, x: WORLD_W / 2, y: 0, w: WORLD_W, kind: 'normal', vx: 0, spring: false, broken: 0, used: false });
  generate(s, 30);
  return s;
}

/** Schwierigkeit 0..1 abhängig von der Höhe. */
const diff = (y: number) => Math.min(1, y / 260);

function generate(s: JumpState, upTo: number) {
  while (s.genY < upTo) {
    const d = diff(s.genY);
    const gap = Math.min(3, 1.1 + d * 1.5 + rnd(s) * (0.5 + d * 0.5)); // Sprunghöhe 3.35
    s.genY += gap;
    const w = 2.1 - d * 0.8 + rnd(s) * 0.4;
    const x = w / 2 + rnd(s) * (WORLD_W - w);
    const r = rnd(s);
    let kind: PlatformKind = 'normal';
    if (s.genY > 25 && r < 0.12 + d * 0.25) kind = 'move';
    else if (s.genY > 45 && r < 0.2 + d * 0.3) kind = 'crumble';
    else if (s.genY > 80 && r < 0.27 + d * 0.3) kind = 'cloud';
    const id = s.nextId++;
    const spring = kind !== 'crumble' && kind !== 'cloud' && rnd(s) < 0.07;
    s.platforms.push({ id, x, y: s.genY, w, kind, vx: kind === 'move' ? (1.2 + d * 2.2) * (rnd(s) < 0.5 ? -1 : 1) : 0, spring, broken: 0, used: false });
    // Zerbrechliche Plattformen: immer eine sichere daneben, damit es lösbar bleibt
    if (kind === 'crumble' || kind === 'cloud') {
      const y2 = s.genY + 0.25 + rnd(s) * 0.5;
      const x2 = (x + WORLD_W / 2 + rnd(s) * 2) % (WORLD_W - 1.5) + 0.75;
      s.platforms.push({ id: s.nextId++, x: x2, y: y2, w: 1.7, kind: 'normal', vx: 0, spring: false, broken: 0, used: false });
      s.genY = y2;
    }
    const ri = rnd(s);
    if (ri < 0.45) s.items.push({ id: s.nextId++, x, y: s.genY + 0.8 + rnd(s) * 0.6, kind: 'star', taken: false });
    else if (s.genY > 60 && ri < 0.48) s.items.push({ id: s.nextId++, x, y: s.genY + 0.9, kind: 'rocket', taken: false });
    else if (s.genY > 90 && ri < 0.5) s.items.push({ id: s.nextId++, x, y: s.genY + 0.9, kind: 'shield', taken: false });
    if (s.genY > 70 && rnd(s) < 0.04 + d * 0.08) {
      s.enemies.push({ id: s.nextId++, x: rnd(s) * WORLD_W, y: s.genY + 1.5, vx: (1 + d * 1.5) * (rnd(s) < 0.5 ? -1 : 1), dead: 0 });
    }
  }
}

const wrap = (x: number) => ((x % WORLD_W) + WORLD_W) % WORLD_W;
/** Kürzester horizontaler Abstand in der Welt mit Rand-Umbruch. */
export const dxWrap = (a: number, b: number) => { let d = a - b; if (d > WORLD_W / 2) d -= WORLD_W; if (d < -WORLD_W / 2) d += WORLD_W; return d; };

const evt = (s: JumpState, text: string) => s.events.push({ text, t: s.time });

/** Ein Zeitschritt. `dir` = -1 links, 0, 1 rechts. `camBottom` = unterer Bildrand in Welt-Einheiten. */
export function step(s: JumpState, dir: number, dt: number, up: JumpUpgrades = NO_UPGRADES, camBottom = -Infinity) {
  if (s.dead) return;
  s.time += dt;
  // Seitwärts: schnelle, aber weiche Steuerung
  const target = dir * 9;
  s.vx += (target - s.vx) * Math.min(1, dt * (dir ? 9 : 6));
  if (dir) s.face = dir > 0 ? 1 : -1;
  s.x = wrap(s.x + s.vx * dt);
  const prevY = s.y;
  if (s.rocket > 0) { s.rocket -= dt; s.vy = ROCKET_V; }
  else s.vy -= G * dt;
  s.y += s.vy * dt;
  s.squash = Math.max(0, s.squash - dt * 4);

  for (const p of s.platforms) {
    if (p.kind === 'move') { p.x += p.vx * dt; if (p.x < p.w / 2 || p.x > WORLD_W - p.w / 2) { p.vx = -p.vx; p.x = Math.max(p.w / 2, Math.min(WORLD_W - p.w / 2, p.x)); } }
    if (p.broken > 0) p.broken += dt;
  }
  // Landen: nur beim Fallen, Füsse kreuzen die Oberkante
  if (s.vy < 0 && s.rocket <= 0) {
    for (const p of s.platforms) {
      if (p.broken > 0) continue;
      if (prevY >= p.y - 0.001 && s.y <= p.y && Math.abs(dxWrap(s.x, p.x)) <= p.w / 2 + 0.25) {
        s.y = p.y; s.squash = 1;
        if (p.kind === 'crumble') { p.broken = 0.001; evt(s, 'Knack!'); }
        if (p.kind === 'cloud') { if (p.used) { p.broken = 0.001; continue; } p.used = true; }
        const feder = 1 + up.feder * 0.06;
        if (p.spring && Math.abs(dxWrap(s.x, p.x)) < 0.6) { s.vy = SPRING * feder; evt(s, 'Boing!'); }
        else s.vy = JUMP * feder;
        break;
      }
    }
  }
  // Sammeln (Magnet zieht Sterne an)
  const reach = 0.7 + up.magnet * 0.9;
  for (const it of s.items) {
    if (it.taken) continue;
    const dx = dxWrap(it.x, s.x), dy = it.y - (s.y + 0.5);
    const dist = Math.hypot(dx, dy);
    if (it.kind === 'star' && up.magnet && dist < reach * 2.2) { it.x = wrap(it.x - dx * Math.min(1, dt * 8)); it.y -= dy * Math.min(1, dt * 8); }
    if (dist < (it.kind === 'star' ? reach : 0.8)) {
      it.taken = true;
      if (it.kind === 'star') s.stars++;
      if (it.kind === 'rocket') { s.rocket = 2.6; s.rockets++; evt(s, 'Rakete!'); }
      if (it.kind === 'shield') { s.shield = true; evt(s, 'Schutzblase!'); }
    }
  }
  // Gegner
  for (const e of s.enemies) {
    if (e.dead) { e.dead += dt; e.y -= dt * 8; continue; }
    e.x = wrap(e.x + e.vx * dt);
    const dx = dxWrap(e.x, s.x), dy = (s.y + 0.4) - e.y;
    if (Math.abs(dx) < 0.75 && Math.abs(dy) < 0.75) {
      if (s.rocket > 0) { e.dead = 0.001; s.stomps++; evt(s, 'Weggeflogen! +25'); }
      else if (s.vy < 0 && dy > 0.1) { e.dead = 0.001; s.stomps++; s.vy = JUMP * 1.1; evt(s, 'Draufgesprungen! +25'); }
      else if (s.shield) { e.dead = 0.001; s.shield = false; s.vy = Math.max(s.vy, JUMP * 0.8); evt(s, 'Blase geplatzt!'); }
      else { s.dead = true; evt(s, 'Erwischt!'); return; }
    }
  }
  if (s.y > s.maxY) {
    const before = Math.floor(heightM(s) / 100);
    s.maxY = s.y;
    const after = Math.floor(heightM(s) / 100);
    if (after > before) evt(s, `${after * 100} m!`);
  }
  // Aufräumen und nachbauen
  const low = s.maxY - 20;
  s.platforms = s.platforms.filter((p) => p.y > low && p.broken < 1);
  s.items = s.items.filter((i) => i.y > low && !i.taken);
  s.enemies = s.enemies.filter((e) => e.y > low && e.dead < 1.5);
  generate(s, s.maxY + 30);
  if (s.y < camBottom - 1) { s.dead = true; evt(s, 'Abgestürzt!'); }
}

export function advance(s: JumpState, dir: number, dt: number, up?: JumpUpgrades, camBottom?: number) {
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  for (let i = 0; i < n && !s.dead; i++) step(s, dir, dt / n, up, camBottom);
}
