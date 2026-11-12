import { type JumpState, WORLD_W } from './engine';
import type { Skin } from './meta';

export interface JView { W: number; H: number; ppm: number; x0: number; camY: number }

export function layout(v: JView) {
  const colW = Math.min(v.W, v.H * 0.78, 760);
  v.ppm = colW / WORLD_W;
  v.x0 = (v.W - colW) / 2;
}
export function updateCam(v: JView, s: JumpState) {
  const visH = v.H / v.ppm;
  v.camY = Math.max(v.camY, s.y - visH * 0.42);
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
// Himmel nach Höhe: Tag → Abend → Nacht → Weltall
const SKY: [number, string, string][] = [[0, '#5DB8EE', '#CDEFFF'], [180, '#7E8FE0', '#FFC28A'], [380, '#1D2660', '#6B4C9A'], [620, '#04050F', '#141A3A']];
function skyAt(h: number): [string, string] {
  let i = 0; while (i < SKY.length - 2 && h > SKY[i + 1][0]) i++;
  const [h0, a0, b0] = SKY[i], [h1, a1, b1] = SKY[i + 1];
  const t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
  return [mix(hex(a0), hex(a1), t), mix(hex(b0), hex(b1), t)];
}
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function starShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sxk = 1) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr * sxk, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

export function drawJump(ctx: CanvasRenderingContext2D, v: JView, s: JumpState, skin: Skin, dir: number, time: number, best: number, reduced: boolean) {
  const { W, H, ppm, x0, camY } = v;
  const h = camY * 2;
  const [top, bottom] = skyAt(h);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sy = (y: number) => H - (y - camY) * ppm;

  // Sterne am Nachthimmel
  const night = Math.max(0, Math.min(1, (h - 260) / 200));
  if (night > 0) {
    for (let i = 0; i < 70; i++) {
      const x = hash(i) * W, y = ((hash(i + 99) * H * 1.5 + camY * ppm * 0.1) % (H * 1.5)) - H * 0.25;
      const tw = reduced ? 1 : 0.6 + 0.4 * Math.sin(time * 2 + i);
      ctx.fillStyle = `rgba(255,255,240,${night * tw})`; ctx.fillRect(x, y, 2, 2);
    }
  }
  // Planeten im Weltall
  const space = Math.max(0, Math.min(1, (h - 560) / 120));
  if (space > 0) {
    ctx.globalAlpha = space;
    const py = ((camY * ppm * 0.05) % (H + 300)) - 150;
    ctx.fillStyle = '#E07A5F'; ctx.beginPath(); ctx.arc(W * 0.18, py + H * 0.3, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F2CC8F'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(W * 0.18, py + H * 0.3, 78, 16, -0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#81B2E8'; ctx.beginPath(); ctx.arc(W * 0.85, py + H * 0.75, 28, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Wolken (Parallax)
  const day = 1 - night;
  if (day > 0.05) {
    ctx.fillStyle = `rgba(255,255,255,${0.75 * day})`;
    const base = Math.floor((camY * 0.5) / 7) - 1;
    for (let k = base; k < base + 6; k++) {
      const wy = k * 7, cx = hash(k) * W, cy = H - (wy - camY * 0.5) * ppm, r = ppm * (0.5 + hash(k + 3) * 0.4);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.arc(cx + r, cy - r * 0.4, r * 1.2, 0, 7); ctx.arc(cx + r * 2.2, cy, r * 0.9, 0, 7); ctx.fill();
    }
  }

  // Spielfläche
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, 0, WORLD_W * ppm, H); ctx.clip();
  // Startwiese mit Häusern
  if (camY < 4) {
    const gy = sy(0);
    ctx.fillStyle = '#3E7F4B';
    for (let i = 0; i < 8; i++) { const bx = x0 + i * ppm * 1.4, bh = ppm * (1.2 + hash(i) * 1.6); ctx.fillRect(bx, gy - bh, ppm * 1.1, bh); }
    ctx.fillStyle = '#5FA052'; ctx.fillRect(x0, gy, WORLD_W * ppm, H);
  }
  // Rekord-Linie
  if (best > 0) {
    const by = sy(best / 2);
    if (by > -20 && by < H + 20) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x0 + WORLD_W * ppm, by); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#C8372D'; rr(ctx, x0 + 8, by - 30, 112, 26, 8); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 14px Nunito, sans-serif'; ctx.fillText(`Rekord ${best} m`, x0 + 16, by - 12);
    }
  }
  // Höhen-Markierungen alle 50 m
  ctx.font = '800 13px Nunito, sans-serif';
  for (let m = Math.ceil(h / 50) * 50; m < h + (H / ppm) * 2 + 50; m += 50) {
    if (m === 0) continue;
    const y = sy(m / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0 + WORLD_W * ppm - 36, y, 36, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText(`${m}`, x0 + WORLD_W * ppm - 38, y - 4);
  }

  const copies = (x: number, f: (px: number) => void) => { const px = x0 + x * ppm; f(px); if (x < 1.5) f(px + WORLD_W * ppm); if (x > WORLD_W - 1.5) f(px - WORLD_W * ppm); };

  for (const p of s.platforms) {
    const y = sy(p.y);
    if (y < -40 || y > H + 40) continue;
    const w = p.w * ppm, th = Math.max(12, ppm * 0.28);
    copies(p.x, (px) => {
      const x = px - w / 2;
      if (p.y === 0 && p.w === WORLD_W) return;
      if (p.kind === 'crumble' && p.broken > 0) {
        const f = p.broken * 30, a = Math.max(0, 1 - p.broken);
        ctx.globalAlpha = a; ctx.fillStyle = '#9C6B3C';
        ctx.save(); ctx.translate(x + w * 0.25, y + f); ctx.rotate(-p.broken); rr(ctx, -w * 0.25, 0, w * 0.48, th, 5); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(x + w * 0.75, y + f); ctx.rotate(p.broken); rr(ctx, -w * 0.23, 0, w * 0.48, th, 5); ctx.fill(); ctx.restore();
        ctx.globalAlpha = 1; return;
      }
      if (p.kind === 'cloud') {
        ctx.fillStyle = p.used ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
        const r = th * 0.9;
        ctx.beginPath(); for (let i = 0; i <= 4; i++) ctx.arc(x + r + (i * (w - 2 * r)) / 4, y + th * 0.3, r * (i % 2 ? 1.15 : 0.9), 0, 7); ctx.fill();
        return;
      }
      const [body, topc] = p.kind === 'move' ? ['#3D6FC9', '#8FC1FF'] : p.kind === 'crumble' ? ['#9C6B3C', '#C99A63'] : ['#8A5A00', '#5FA052'];
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(ctx, x + 3, y + 5, w, th, 7); ctx.fill();
      ctx.fillStyle = body; rr(ctx, x, y, w, th, 7); ctx.fill();
      ctx.fillStyle = topc; rr(ctx, x, y, w, th * 0.42, 7); ctx.fill();
      if (p.kind === 'crumble') {
        ctx.strokeStyle = '#5A3A1A'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.52, y + th * 0.5); ctx.lineTo(x + w * 0.47, y + th); ctx.stroke();
      }
      if (p.kind === 'move') { ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${th * 0.7}px Nunito, sans-serif`; ctx.fillText('‹ ›', x + w / 2 - th * 0.55, y + th * 0.85); }
      if (p.spring) {
        const cx = px, sw = ppm * 0.5;
        ctx.strokeStyle = '#7A7A7A'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i <= 4; i++) ctx.lineTo(cx + (i % 2 ? sw / 3 : -sw / 3), y - (i * ppm * 0.32) / 4);
        ctx.stroke(); ctx.fillStyle = '#E0352B'; rr(ctx, cx - sw / 2, y - ppm * 0.42, sw, ppm * 0.14, 4); ctx.fill();
      }
    });
  }

  for (const it of s.items) {
    const y = sy(it.y);
    if (y < -40 || y > H + 40) continue;
    const bob = reduced ? 0 : Math.sin(time * 3 + it.id) * ppm * 0.08;
    copies(it.x, (px) => {
      if (it.kind === 'star') {
        starShape(ctx, px, y + bob, ppm * 0.32, reduced ? 1 : Math.max(0.25, Math.abs(Math.cos(time * 2.5 + it.id))));
        ctx.fillStyle = '#F2B33D'; ctx.fill(); ctx.strokeStyle = '#C98A12'; ctx.lineWidth = 2; ctx.stroke();
      } else if (it.kind === 'rocket') {
        ctx.save(); ctx.translate(px, y + bob); drawRocket(ctx, ppm * 0.9, false, time); ctx.restore();
      } else {
        ctx.strokeStyle = 'rgba(120,200,255,0.95)'; ctx.fillStyle = 'rgba(160,220,255,0.35)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, y + bob, ppm * 0.38, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(px - ppm * 0.12, y + bob - ppm * 0.14, ppm * 0.08, 0, 7); ctx.fill();
      }
    });
  }

  for (const e of s.enemies) {
    const y = sy(e.y);
    if (y < -60 || y > H + 60) continue;
    copies(e.x, (px) => {
      ctx.save(); ctx.translate(px, y);
      if (e.dead) { ctx.rotate(e.dead * 8); ctx.globalAlpha = Math.max(0, 1 - e.dead / 1.5); }
      const r = ppm * 0.42, flap = reduced ? 0.5 : Math.abs(Math.sin(time * 18 + e.id));
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.9, r * 0.35, r * (0.3 + flap * 0.4), -0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.3, -r * 0.9, r * 0.35, r * (0.3 + flap * 0.4), 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#F5C518'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2B2B2B'; ctx.fillRect(-r * 0.35, -r, r * 0.25, r * 2); ctx.fillRect(r * 0.2, -r, r * 0.25, r * 2);
      const f = e.vx > 0 ? 1 : -1;
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(f * r * 0.7, -r * 0.2, r * 0.28, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(f * r * 0.78, -r * 0.2, r * 0.13, 0, 7); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f * r * 0.45, -r * 0.62); ctx.lineTo(f * r * 0.95, -r * 0.42); ctx.stroke();
      ctx.restore();
    });
  }

  // Held
  copies(s.x, (px) => { ctx.save(); ctx.translate(px, sy(s.y)); drawHero(ctx, ppm, s, skin, dir, time); ctx.restore(); });
  ctx.restore();

  // Rand der Spielfläche
  if (x0 > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, x0, H); ctx.fillRect(x0 + WORLD_W * ppm, 0, W, H);
  }
}

function drawRocket(ctx: CanvasRenderingContext2D, size: number, flame: boolean, time: number) {
  const w = size * 0.4, h = size;
  if (flame) {
    const f = 0.7 + 0.3 * Math.sin(time * 40);
    ctx.fillStyle = '#FFB020'; ctx.beginPath(); ctx.moveTo(-w * 0.35, h * 0.35); ctx.lineTo(0, h * (0.35 + 0.6 * f)); ctx.lineTo(w * 0.35, h * 0.35); ctx.fill();
    ctx.fillStyle = '#FFF2A0'; ctx.beginPath(); ctx.moveTo(-w * 0.18, h * 0.35); ctx.lineTo(0, h * (0.35 + 0.3 * f)); ctx.lineTo(w * 0.18, h * 0.35); ctx.fill();
  }
  ctx.fillStyle = '#C8372D'; ctx.beginPath(); ctx.moveTo(-w, h * 0.38); ctx.lineTo(-w / 2, h * 0.1); ctx.lineTo(w / 2, h * 0.1); ctx.lineTo(w, h * 0.38); ctx.fill();
  ctx.fillStyle = '#EDEDED'; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(w * 0.7, -h * 0.1, w / 2, h * 0.35); ctx.lineTo(-w / 2, h * 0.35); ctx.quadraticCurveTo(-w * 0.7, -h * 0.1, 0, -h / 2); ctx.fill();
  ctx.fillStyle = '#4FA3E0'; ctx.beginPath(); ctx.arc(0, -h * 0.08, w * 0.28, 0, 7); ctx.fill();
}

export function drawHero(ctx: CanvasRenderingContext2D, ppm: number, s: Pick<JumpState, 'vy' | 'squash' | 'face' | 'rocket' | 'shield'>, skin: Skin, dir: number, time: number) {
  const r = ppm * 0.42;
  const stretch = s.squash > 0 ? 1 - s.squash * 0.25 : 1 + Math.min(0.15, Math.max(0, s.vy) * 0.01);
  const wide = 2 - stretch;
  if (s.rocket > 0) { ctx.save(); ctx.translate(-s.face * r * 0.9, -r * 1.1); drawRocket(ctx, ppm * 0.9, true, time); ctx.restore(); }
  ctx.save();
  ctx.rotate(dir * 0.12);
  // Füsse
  ctx.fillStyle = '#3A2A20';
  ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.1, r * 0.3, r * 0.17, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.1, r * 0.3, r * 0.17, 0, 0, 7); ctx.fill();
  ctx.translate(0, -r * stretch - r * 0.1);
  ctx.scale(wide, stretch);
  ctx.fillStyle = skin.body; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = skin.belly; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.6, r * 0.5, 0, 0, 7); ctx.fill();
  const f = s.face;
  if (skin.extra === 'helmet') { ctx.fillStyle = 'rgba(140,200,255,0.55)'; ctx.beginPath(); ctx.arc(f * r * 0.15, -r * 0.2, r * 0.7, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(f * r * 0.05, -r * 0.25, r * 0.28, 0, 7); ctx.arc(f * r * 0.55, -r * 0.25, r * 0.24, 0, 7); ctx.fill();
  const look = s.vy < -2 ? r * 0.08 : -r * 0.04;
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath(); ctx.arc(f * r * 0.13, -r * 0.25 + look, r * 0.12, 0, 7); ctx.arc(f * r * 0.62, -r * 0.25 + look, r * 0.11, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.beginPath();
  ctx.arc(f * r * 0.35, r * 0.1, r * 0.2, 0.2, Math.PI - 0.2); ctx.stroke();
  switch (skin.extra) {
    case 'cap':
      ctx.fillStyle = '#C8372D'; ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.75, Math.PI, 0); ctx.fill();
      ctx.fillRect(f > 0 ? 0 : -r * 1.15, -r * 0.6, r * 1.15, r * 0.16); break;
    case 'band':
      ctx.fillStyle = '#C8372D'; ctx.fillRect(-r, -r * 0.62, r * 2, r * 0.2);
      ctx.beginPath(); ctx.moveTo(-f * r, -r * 0.55); ctx.lineTo(-f * r * 1.6, -r * (0.3 + 0.2 * Math.sin(time * 10))); ctx.lineTo(-f * r * 1.5, -r * 0.7); ctx.fill(); break;
    case 'bow':
      ctx.fillStyle = '#E8B4D0'; ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.5); ctx.lineTo(-r * 0.55, -r * 1.25); ctx.lineTo(-r * 0.2, -r * 0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.5); ctx.lineTo(r * 0.55, -r * 1.25); ctx.lineTo(r * 0.2, -r * 0.8); ctx.fill();
      ctx.fillStyle = '#E0457B'; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.85, r * 0.15, 0, 7); ctx.fill(); break;
    case 'helmet':
      ctx.strokeStyle = '#B9C6D8'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, 7); ctx.stroke(); break;
    case 'horns':
      ctx.fillStyle = '#F2C94C';
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.7); ctx.lineTo(-r * 0.75, -r * 1.35); ctx.lineTo(-r * 0.25, -r * 0.9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.7); ctx.lineTo(r * 0.75, -r * 1.35); ctx.lineTo(r * 0.25, -r * 0.9); ctx.fill(); break;
    case 'crown':
      ctx.fillStyle = '#F2B33D'; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.75);
      ctx.lineTo(-r * 0.65, -r * 1.35); ctx.lineTo(-r * 0.3, -r * 1.05); ctx.lineTo(0, -r * 1.45); ctx.lineTo(r * 0.3, -r * 1.05); ctx.lineTo(r * 0.65, -r * 1.35); ctx.lineTo(r * 0.6, -r * 0.75); ctx.fill(); break;
  }
  ctx.restore();
  if (s.shield) {
    ctx.strokeStyle = 'rgba(120,200,255,0.9)'; ctx.fillStyle = 'rgba(160,220,255,0.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -r * 1.05, r * 1.6, 0, 7); ctx.fill(); ctx.stroke();
  }
}
