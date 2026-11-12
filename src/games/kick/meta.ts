import { emptyMissions, type Mission, type MissionState } from '../missions';
import type { KickUpgrades } from './engine';

export interface BallSkin { id: string; name: string; price: number; base: string; patch: string; trail: string }
export const BALLS: BallSkin[] = [
  { id: 'klassik', name: 'Klassiker', price: 0, base: '#FFFFFF', patch: '#222222', trail: 'rgba(255,255,255,0.5)' },
  { id: 'rot', name: 'Feuerball', price: 15, base: '#FF7A1A', patch: '#B3200E', trail: 'rgba(255,120,30,0.6)' },
  { id: 'blau', name: 'Eisball', price: 30, base: '#BFE8FF', patch: '#2F6BD8', trail: 'rgba(140,210,255,0.6)' },
  { id: 'gruen', name: 'Schleimball', price: 50, base: '#9BE15D', patch: '#2F7D4F', trail: 'rgba(120,220,90,0.6)' },
  { id: 'gold', name: 'Goldball', price: 80, base: '#F2C94C', patch: '#9A6400', trail: 'rgba(255,215,80,0.7)' },
  { id: 'regen', name: 'Regenbogen', price: 120, base: '#FFFFFF', patch: 'rainbow', trail: 'rainbow' },
];

export interface KickUpDef { id: keyof KickUpgrades; name: string; desc: string; prices: number[] }
export const KICK_UPGRADES: KickUpDef[] = [
  { id: 'praezision', name: 'Präzision', desc: 'Harte Schüsse streuen weniger.', prices: [10, 25, 50] },
  { id: 'kraft', name: 'Schusskraft', desc: 'Der Ball fliegt schneller – weniger Zeit für den Torhüter.', prices: [15, 35, 70] },
  { id: 'effet', name: 'Effet', desc: 'Bananenflanken krümmen sich stärker.', prices: [15, 35, 70] },
  { id: 'extra', name: 'Extra-Ball', desc: 'Starte mit 4 statt 3 Bällen.', prices: [60] },
];

export const KICK_MISSIONS: Mission[] = [
  { id: 'g3', text: 'Schiess 3 Tore', key: 'goals', target: 3, scope: 'total', reward: 3 },
  { id: 'c2', text: 'Triff 2-mal in die Ecke', key: 'corners', target: 2, scope: 'total', reward: 4 },
  { id: 's3', text: 'Schaffe eine Serie von 3 Toren', key: 'streak', target: 3, scope: 'round', reward: 5 },
  { id: 't1', text: 'Triff eine Zielscheibe', key: 'targets', target: 1, scope: 'total', reward: 5 },
  { id: 'l3', text: 'Erreiche Level 3', key: 'level', target: 3, scope: 'round', reward: 6 },
  { id: 'cu3', text: 'Schiess 3 Tore mit Effet (gebogen wischen)', key: 'curls', target: 3, scope: 'total', reward: 8 },
  { id: 'p1500', text: 'Schaffe 1500 Punkte in einer Runde', key: 'points', target: 1500, scope: 'round', reward: 10 },
  { id: 'g30', text: 'Schiess insgesamt 30 Tore', key: 'goals', target: 30, scope: 'total', reward: 12 },
  { id: 's6', text: 'Schaffe eine Serie von 6 Toren', key: 'streak', target: 6, scope: 'round', reward: 15 },
  { id: 't10', text: 'Triff 10 Zielscheiben', key: 'targets', target: 10, scope: 'total', reward: 15 },
  { id: 'l6', text: 'Erreiche Level 6', key: 'level', target: 6, scope: 'round', reward: 20 },
  { id: 'p5000', text: 'Schaffe 5000 Punkte in einer Runde', key: 'points', target: 5000, scope: 'round', reward: 25 },
  { id: 'g100', text: 'Schiess insgesamt 100 Tore', key: 'goals', target: 100, scope: 'total', reward: 30 },
  { id: 'l10', text: 'Erreiche Level 10', key: 'level', target: 10, scope: 'round', reward: 50 },
];

export interface KickProgress { best: number; bestLevel: number; wallet: number; balls: string[]; ball: string; up: KickUpgrades; missions: MissionState }

export function loadKick(raw: unknown): KickProgress {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<KickProgress>;
  return {
    best: Number(r.best) || 0, bestLevel: Number(r.bestLevel) || 0, wallet: Number(r.wallet) || 0,
    balls: Array.isArray(r.balls) && r.balls.length ? r.balls : ['klassik'], ball: r.ball ?? 'klassik',
    up: { praezision: 0, kraft: 0, effet: 0, extra: 0, ...(r.up ?? {}) }, missions: r.missions ?? emptyMissions(),
  };
}
