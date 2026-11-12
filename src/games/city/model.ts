/**
 * Baumeister: Aufbau-Stadt. Häuser bringen Einwohner (Steuern), Läden und Fabriken
 * produzieren Taler (antippen zum Einsammeln), Bäume und Parks machen glücklich.
 * Gebäude funktionieren nur mit Strasse daneben.
 */
import type { Mission, MissionState } from '../missions';
import { emptyMissions } from '../missions';

export const COLS = 10, ROWS = 6;
export type Kind = 'road' | 'house' | 'tree' | 'shop' | 'park' | 'factory' | 'school' | 'tower' | 'stadium' | 'wheel' | 'rocket';
export interface Cell { t: Kind; l: number; c: number }
export interface City { v: 2; cells: (Cell | null)[]; money: number; earned: number; missions: MissionState; last: number }

export interface Def {
  name: string; cost: number; unlock: number; needsRoad: boolean; up: number[];
  pop?: number[]; income?: number[]; jobs?: number; joy?: number; radius?: number; desc: string;
}
export const DEFS: Record<Kind, Def> = {
  road: { name: 'Strasse', cost: 2, unlock: 0, needsRoad: false, up: [], desc: 'Verbindet Gebäude. Ohne Strasse arbeitet nichts.' },
  house: { name: 'Haus', cost: 15, unlock: 0, needsRoad: true, up: [40, 120], pop: [4, 10, 20], desc: 'Bringt Einwohner. Einwohner zahlen Steuern.' },
  tree: { name: 'Baum', cost: 5, unlock: 0, needsRoad: false, up: [], joy: 1, radius: 1, desc: 'Macht die Nachbarn glücklich.' },
  shop: { name: 'Laden', cost: 30, unlock: 8, needsRoad: true, up: [80, 200], income: [0.5, 1.2, 2.2], jobs: 4, desc: 'Produziert Taler. Braucht 4 Arbeiter.' },
  park: { name: 'Park', cost: 40, unlock: 15, needsRoad: false, up: [], joy: 2, radius: 2, desc: 'Viel Freude im Umkreis von 2 Feldern.' },
  factory: { name: 'Fabrik', cost: 120, unlock: 30, needsRoad: true, up: [300], income: [2, 4.5], jobs: 10, joy: -2, radius: 1, desc: 'Viele Taler, aber laut: Nachbarn sind weniger glücklich.' },
  school: { name: 'Schule', cost: 150, unlock: 45, needsRoad: true, up: [], joy: 3, radius: 2, desc: 'Familien ziehen gern hierher: +10 % Einwohner.' },
  tower: { name: 'Hochhaus', cost: 300, unlock: 60, needsRoad: true, up: [500], pop: [40, 70], desc: 'Sehr viele Einwohner auf einem Feld.' },
  stadium: { name: 'Stadion', cost: 600, unlock: 120, needsRoad: true, up: [], income: [4], jobs: 15, joy: 4, radius: 3, desc: 'Tickets bringen Taler, alle feiern mit.' },
  wheel: { name: 'Riesenrad', cost: 1000, unlock: 200, needsRoad: true, up: [], income: [6], jobs: 10, joy: 5, radius: 3, desc: 'Das Wahrzeichen deiner Stadt.' },
  rocket: { name: 'Raketenbasis', cost: 2500, unlock: 350, needsRoad: true, up: [], income: [15], jobs: 30, joy: 3, radius: 2, desc: 'Deine Stadt fliegt ins All!' },
};
export const KINDS = Object.keys(DEFS) as Kind[];
export const TAX = 0.05; // Taler pro Einwohner und Sekunde
export const STORE_SECS = 45; // so lange füllt sich ein Laden, dann ist er voll
export const LEVELS: [number, string][] = [[0, 'Dorf'], [30, 'Kleinstadt'], [80, 'Stadt'], [200, 'Grossstadt'], [400, 'Metropole'], [800, 'Weltstadt']];

const nb = (i: number, r: number) => {
  const out: number[] = []; const x0 = i % COLS, y0 = Math.floor(i / COLS);
  for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
    if ((x === x0 && y === y0) || x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    if (Math.abs(x - x0) + Math.abs(y - y0) <= r + (r > 1 ? 1 : 1)) out.push(y * COLS + x);
  }
  return out;
};
export const neighbors4 = (i: number) => {
  const x = i % COLS, y = Math.floor(i / COLS), o: number[] = [];
  if (y > 0) o.push(i - COLS); if (y < ROWS - 1) o.push(i + COLS); if (x > 0) o.push(i - 1); if (x < COLS - 1) o.push(i + 1);
  return o;
};

export function connected(c: City, i: number) {
  const cell = c.cells[i];
  if (!cell) return false;
  if (!DEFS[cell.t].needsRoad) return true;
  return neighbors4(i).some((j) => c.cells[j]?.t === 'road');
}

export interface Stats { pop: number; jobs: number; work: number; joy: number[]; perSec: number; taxPerSec: number; prodPerSec: number[]; level: number; levelName: string; next: number | null; counts: Record<Kind, number>; maxHouse: number; unconnected: number }

export function stats(c: City): Stats {
  const joy = c.cells.map(() => 0);
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>;
  let schools = 0, unconnected = 0, maxHouse = 0;
  c.cells.forEach((cell, i) => {
    if (!cell) return;
    counts[cell.t]++;
    if (!connected(c, i)) { unconnected++; return; }
    const d = DEFS[cell.t];
    if (cell.t === 'school') schools++;
    if (cell.t === 'house') maxHouse = Math.max(maxHouse, cell.l);
    if (d.joy && d.radius) for (const j of nb(i, d.radius)) joy[j] += d.joy;
  });
  let pop = 0, jobs = 0;
  c.cells.forEach((cell, i) => {
    if (!cell || !connected(c, i)) return;
    const d = DEFS[cell.t];
    if (d.pop) pop += d.pop[cell.l - 1] * (1 + Math.max(-2, Math.min(5, joy[i])) * 0.08);
    if (d.jobs) jobs += d.jobs;
  });
  pop = Math.floor(pop * (1 + Math.min(2, schools) * 0.1));
  const work = jobs ? Math.min(1, pop / jobs) : 1;
  const prodPerSec = c.cells.map((cell, i) => {
    if (!cell || !connected(c, i)) return 0;
    const inc = DEFS[cell.t].income;
    return inc ? inc[cell.l - 1] * work * (1 + Math.max(0, Math.min(4, joy[i])) * 0.05) : 0;
  });
  const taxPerSec = pop * TAX;
  let li = 0; while (li < LEVELS.length - 1 && pop >= LEVELS[li + 1][0]) li++;
  return { pop, jobs, work, joy, perSec: taxPerSec + prodPerSec.reduce((a, b) => a + b, 0), taxPerSec, prodPerSec, level: li, levelName: LEVELS[li][1], next: LEVELS[li + 1]?.[0] ?? null, counts, maxHouse, unconnected };
}

/** Zeit vergeht: Steuern direkt aufs Konto, Produktion füllt die Gebäude. */
export function tick(c: City, secs: number, st = stats(c)): City {
  const tax = st.taxPerSec * secs;
  const cells = c.cells.map((cell, i) => (cell && st.prodPerSec[i] ? { ...cell, c: Math.min(st.prodPerSec[i] * STORE_SECS, cell.c + st.prodPerSec[i] * secs) } : cell));
  return { ...c, cells, money: c.money + tax, earned: c.earned + tax };
}

/** Rückkehr nach einer Pause: höchstens 20 Minuten Steuern, Gebäude sind voll. */
export function welcomeBack(c: City, now: number): { city: City; gained: number } {
  const away = Math.max(0, Math.min(20 * 60, (now - c.last) / 1000));
  if (away < 30) return { city: { ...c, last: now }, gained: 0 };
  const before = c.money;
  const city = tick(c, away);
  return { city: { ...city, last: now }, gained: Math.floor(city.money - before) };
}

export function collect(c: City, i: number): { city: City; gained: number } {
  const cell = c.cells[i];
  if (!cell || cell.c < 1) return { city: c, gained: 0 };
  const gained = Math.floor(cell.c);
  const cells = c.cells.slice(); cells[i] = { ...cell, c: cell.c - gained };
  return { city: { ...c, cells, money: c.money + gained, earned: c.earned + gained }, gained };
}

export type BuildError = 'geld' | 'besetzt' | 'gesperrt';
export function canBuild(c: City, kind: Kind, i: number, st = stats(c)): BuildError | null {
  if (c.cells[i]) return 'besetzt';
  if (st.pop < DEFS[kind].unlock) return 'gesperrt';
  if (c.money < DEFS[kind].cost) return 'geld';
  return null;
}
export function build(c: City, kind: Kind, i: number): City {
  if (canBuild(c, kind, i)) return c;
  const cells = c.cells.slice(); cells[i] = { t: kind, l: 1, c: 0 };
  return { ...c, cells, money: c.money - DEFS[kind].cost };
}
export const upgradeCost = (cell: Cell) => DEFS[cell.t].up[cell.l - 1];
export function upgrade(c: City, i: number): City {
  const cell = c.cells[i]; if (!cell) return c;
  const cost = upgradeCost(cell);
  if (cost === undefined || c.money < cost) return c;
  const cells = c.cells.slice(); cells[i] = { ...cell, l: cell.l + 1 };
  return { ...c, cells, money: c.money - cost };
}
/** Abreissen gibt die Hälfte der Baukosten zurück (plus gesammelte Taler). */
export function demolish(c: City, i: number): City {
  const cell = c.cells[i]; if (!cell) return c;
  const d = DEFS[cell.t];
  const refund = Math.floor((d.cost + d.up.slice(0, cell.l - 1).reduce((a, b) => a + b, 0)) / 2) + Math.floor(cell.c);
  const cells = c.cells.slice(); cells[i] = null;
  return { ...c, cells, money: c.money + refund };
}

export const CITY_MISSIONS: Mission[] = [
  { id: 'h3', text: 'Baue 3 Häuser', key: 'house', target: 3, scope: 'round', reward: 20 },
  { id: 't3', text: 'Pflanze 3 Bäume', key: 'tree', target: 3, scope: 'round', reward: 10 },
  { id: 'p10', text: 'Erreiche 10 Einwohner', key: 'pop', target: 10, scope: 'round', reward: 25 },
  { id: 's1', text: 'Eröffne einen Laden', key: 'shop', target: 1, scope: 'round', reward: 30 },
  { id: 'c50', text: 'Sammle 50 Taler in Läden ein', key: 'collected', target: 50, scope: 'total', reward: 30 },
  { id: 'hl2', text: 'Baue ein Haus auf Stufe 2 aus', key: 'maxHouse', target: 2, scope: 'round', reward: 30 },
  { id: 'p30', text: 'Werde eine Kleinstadt (30 Einwohner)', key: 'pop', target: 30, scope: 'round', reward: 50 },
  { id: 'pk1', text: 'Lege einen Park an', key: 'park', target: 1, scope: 'round', reward: 40 },
  { id: 'f1', text: 'Baue eine Fabrik', key: 'factory', target: 1, scope: 'round', reward: 60 },
  { id: 'sc1', text: 'Baue eine Schule', key: 'school', target: 1, scope: 'round', reward: 80 },
  { id: 'p80', text: 'Werde eine Stadt (80 Einwohner)', key: 'pop', target: 80, scope: 'round', reward: 100 },
  { id: 'hl3', text: 'Baue ein Haus auf Stufe 3 aus', key: 'maxHouse', target: 3, scope: 'round', reward: 80 },
  { id: 'tw1', text: 'Baue ein Hochhaus', key: 'tower', target: 1, scope: 'round', reward: 150 },
  { id: 'i5', text: 'Verdiene 5 Taler pro Sekunde', key: 'perSec', target: 5, scope: 'round', reward: 150 },
  { id: 'st1', text: 'Baue ein Stadion', key: 'stadium', target: 1, scope: 'round', reward: 250 },
  { id: 'p200', text: 'Werde eine Grossstadt (200 Einwohner)', key: 'pop', target: 200, scope: 'round', reward: 300 },
  { id: 'w1', text: 'Baue das Riesenrad', key: 'wheel', target: 1, scope: 'round', reward: 400 },
  { id: 'p400', text: 'Werde eine Metropole (400 Einwohner)', key: 'pop', target: 400, scope: 'round', reward: 600 },
  { id: 'r1', text: 'Baue die Raketenbasis', key: 'rocket', target: 1, scope: 'round', reward: 1000 },
  { id: 'p800', text: 'Werde eine Weltstadt (800 Einwohner)', key: 'pop', target: 800, scope: 'round', reward: 2000 },
];
/** Werte, die für Aufträge zählen (Momentaufnahme der Stadt). */
export const missionValues = (st: Stats): Record<string, number> => ({ ...st.counts, pop: st.pop, maxHouse: st.maxHouse, perSec: Math.floor(st.perSec * 10) / 10 });

const OLD: Record<string, Kind> = { house: 'house', tree: 'tree', tower: 'tower', road: 'road' };
export function startCity(): City {
  const cells: (Cell | null)[] = Array(COLS * ROWS).fill(null);
  for (let i = 21; i <= 28; i++) cells[i] = { t: 'road', l: 1, c: 0 };
  cells[12] = { t: 'house', l: 1, c: 0 }; cells[14] = { t: 'tree', l: 1, c: 0 };
  return { v: 2, cells, money: 60, earned: 0, missions: emptyMissions(), last: Date.now() };
}
/** Neuer Spielstand, oder die alte Stadt (Liste mit 60 Feldern) übernehmen. */
export function loadCity(raw: unknown, old?: string[]): City {
  const r = raw as Partial<City> | undefined;
  if (r && r.v === 2 && Array.isArray(r.cells) && r.cells.length === COLS * ROWS) {
    return { v: 2, cells: r.cells.map((x) => (x && DEFS[x.t] ? { t: x.t, l: Math.max(1, Math.min(DEFS[x.t].up.length + 1, x.l || 1)), c: Number(x.c) || 0 } : null)),
      money: Number(r.money) || 0, earned: Number(r.earned) || 0, missions: r.missions ?? emptyMissions(), last: Number(r.last) || Date.now() };
  }
  const c = startCity();
  if (old && old.length === COLS * ROWS) c.cells = old.map((v) => (OLD[v] ? { t: OLD[v], l: 1, c: 0 } : null));
  return c;
}
