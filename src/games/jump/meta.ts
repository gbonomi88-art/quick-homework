import type { Mission, MissionState } from '../missions';
import { emptyMissions } from '../missions';
import type { JumpUpgrades } from './engine';

export interface Skin { id: string; name: string; price: number; body: string; belly: string; extra: 'none' | 'cap' | 'band' | 'helmet' | 'crown' | 'horns' | 'bow' }
export const SKINS: Skin[] = [
  { id: 'held', name: 'Hüpfi', price: 0, body: '#F08A24', belly: '#FFD9A8', extra: 'cap' },
  { id: 'frosch', name: 'Frosch', price: 40, body: '#4CAF50', belly: '#C8F0B0', extra: 'none' },
  { id: 'ninja', name: 'Ninja', price: 90, body: '#2B2F3A', belly: '#5A6072', extra: 'band' },
  { id: 'katze', name: 'Katze', price: 140, body: '#E8B4D0', belly: '#FFF0F7', extra: 'bow' },
  { id: 'astro', name: 'Astronaut', price: 220, body: '#E9EEF5', belly: '#B9C6D8', extra: 'helmet' },
  { id: 'drache', name: 'Drache', price: 320, body: '#8A4FD8', belly: '#F2C94C', extra: 'horns' },
  { id: 'koenig', name: 'König', price: 480, body: '#2F6BD8', belly: '#BFD6FF', extra: 'crown' },
];

export interface UpgradeDef { id: keyof JumpUpgrades; name: string; desc: string; prices: number[] }
export const UPGRADES: UpgradeDef[] = [
  { id: 'feder', name: 'Sprungfedern', desc: 'Jede Stufe springt 6 % höher.', prices: [30, 70, 140] },
  { id: 'magnet', name: 'Stern-Magnet', desc: 'Zieht Sterne aus der Nähe an.', prices: [60, 150] },
  { id: 'rakete', name: 'Start-Rakete', desc: 'Du startest mit einem Raketen-Schub.', prices: [80, 180] },
  { id: 'schild', name: 'Start-Blase', desc: 'Eine Schutzblase gegen einen Gegner.', prices: [120] },
];

export const MISSIONS: Mission[] = [
  { id: 'h50', text: 'Erreiche 50 m', key: 'height', target: 50, scope: 'round', reward: 10 },
  { id: 's10', text: 'Sammle 10 Sterne', key: 'stars', target: 10, scope: 'total', reward: 10 },
  { id: 'h100', text: 'Erreiche 100 m', key: 'height', target: 100, scope: 'round', reward: 20 },
  { id: 'r3', text: 'Spiele 3 Runden', key: 'rounds', target: 3, scope: 'total', reward: 15 },
  { id: 'st1', text: 'Spring auf einen Gegner', key: 'stomps', target: 1, scope: 'total', reward: 20 },
  { id: 'rs15', text: 'Sammle 15 Sterne in einer Runde', key: 'stars', target: 15, scope: 'round', reward: 25 },
  { id: 'rk2', text: 'Flieg 2-mal mit der Rakete', key: 'rockets', target: 2, scope: 'total', reward: 25 },
  { id: 'h200', text: 'Erreiche 200 m', key: 'height', target: 200, scope: 'round', reward: 40 },
  { id: 's100', text: 'Sammle insgesamt 100 Sterne', key: 'stars', target: 100, scope: 'total', reward: 40 },
  { id: 'st5', text: 'Spring auf 5 Gegner', key: 'stomps', target: 5, scope: 'total', reward: 50 },
  { id: 'p800', text: 'Schaffe 800 Punkte in einer Runde', key: 'points', target: 800, scope: 'round', reward: 60 },
  { id: 'h400', text: 'Erreiche 400 m', key: 'height', target: 400, scope: 'round', reward: 80 },
  { id: 'r20', text: 'Spiele 20 Runden', key: 'rounds', target: 20, scope: 'total', reward: 60 },
  { id: 'h600', text: 'Erreiche 600 m – das Weltall!', key: 'height', target: 600, scope: 'round', reward: 120 },
  { id: 's500', text: 'Sammle insgesamt 500 Sterne', key: 'stars', target: 500, scope: 'total', reward: 150 },
  { id: 'h1000', text: 'Erreiche 1000 m', key: 'height', target: 1000, scope: 'round', reward: 250 },
];

export interface JumpProgress { best: number; bestPoints: number; wallet: number; skins: string[]; skin: string; up: JumpUpgrades; missions: MissionState }

export function loadJump(raw: unknown): JumpProgress {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<JumpProgress>;
  return {
    best: Number(r.best) || 0, bestPoints: Number(r.bestPoints) || 0, wallet: Number(r.wallet) || 0,
    skins: Array.isArray(r.skins) && r.skins.length ? r.skins : ['held'], skin: r.skin ?? 'held',
    up: { feder: 0, magnet: 0, rakete: 0, schild: 0, ...(r.up ?? {}) },
    missions: r.missions ?? emptyMissions(),
  };
}
