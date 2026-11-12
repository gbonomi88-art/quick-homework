import { DRIVER, SHAPES } from './cars';
import { type CarSpec, type CarState, STAR_EVERY, starX, terrain, toWorld } from './engine';
import type { Garage } from '../../store/types';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; size: number }
export interface View { camX: number; camY: number; ppm: number; W: number; H: number }

const paths = new Map<string, Path2D>();
const path = (d: string) => { let p = paths.get(d); if (!p) { p = new Path2D(d); paths.set(d, p); } return p; };

export function updateCamera(v: View, s: CarState, dt: number) {
  v.ppm = Math.max(26, Math.min(72, v.H / 10.5, v.W / 8.5));
  // Vorausschau, aber nie so weit, dass das Auto aus dem Bild rutscht
  const targetX = s.x + Math.min(2.2 + Math.max(0, s.vx) * 0.25, (v.W / v.ppm) * 0.22);
  const targetY = s.y + 0.6;
  const k = Math.min(1, dt * 4);
  v.camX += (targetX - v.camX) * k;
  v.camY += (targetY - v.camY) * Math.min(1, dt * 3);
}

const sx = (v: View, x: number) => (x - v.camX) * v.ppm + v.W * 0.38;
const sy = (v: View, y: number) => v.H * 0.6 - (y - v.camY) * v.ppm;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function draw(ctx: CanvasRenderingContext2D, v: View, s: CarState, spec: CarSpec, g: Garage, input: { gas: boolean },
  particles: Particle[], time: number, best: number, reduced: boolean) {
  const { W, H, ppm } = v;
  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6EC3F0'); sky.addColorStop(0.65, '#BFE6F7'); sky.addColorStop(1, '#FDEBCB');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // Sonne
  const sunX = W * 0.82, sunY = H * 0.2;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, H * 0.22);
  glow.addColorStop(0, 'rgba(255,236,150,0.9)'); glow.addColorStop(1, 'rgba(255,236,150,0)');
  ctx.fillStyle = glow; ctx.fillRect(sunX - H * 0.25, sunY - H * 0.25, H * 0.5, H * 0.5);
  ctx.fillStyle = '#FFE58A'; ctx.beginPath(); ctx.arc(sunX, sunY, Math.max(18, H * 0.05), 0, Math.PI * 2); ctx.fill();
  // Wolken
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 6; i++) {
    const span = W + 300;
    const cx = (((i * 337 - v.camX * ppm * 0.08 - (reduced ? 0 : time * 8)) % span) + span) % span - 150;
    const cy = H * (0.1 + (i % 3) * 0.08);
    const r = 18 + (i % 2) * 10;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.arc(cx + r, cy - r * 0.4, r * 1.2, 0, Math.PI * 2); ctx.arc(cx + r * 2.2, cy, r * 0.9, 0, Math.PI * 2); ctx.fill();
  }
  // Berge (weit) und Hügel (nah) – Parallax
  const layer = (par: number, base: number, amp: number, f: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let px = 0; px <= W + 8; px += 8) {
      const wx = (px - W * 0.38) / ppm + v.camX * par;
      const h = Math.sin(wx * f) * amp + Math.sin(wx * f * 2.3 + 1) * amp * 0.4 + Math.sin(wx * f * 0.37 + 2) * amp * 0.8;
      ctx.lineTo(px, H * base - h * ppm * 0.6 + (v.camY * (1 - par)) * ppm * 0.15);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  };
  layer(0.12, 0.55, 2.6, 0.08, '#A9C6E3');
  layer(0.3, 0.66, 1.6, 0.13, '#8FC48A');
  // Boden
  const x0 = v.camX - (W * 0.38) / ppm - 1, x1 = x0 + W / ppm + 2;
  const dirt = ctx.createLinearGradient(0, sy(v, v.camY), 0, H + 200);
  dirt.addColorStop(0, '#9A6634'); dirt.addColorStop(1, '#5E3B1C');
  ctx.beginPath(); ctx.moveTo(sx(v, x0), H + 10);
  const step = 6 / ppm;
  for (let x = x0; x <= x1; x += step) ctx.lineTo(sx(v, x), sy(v, terrain(x)));
  ctx.lineTo(sx(v, x1), H + 10); ctx.closePath();
  ctx.fillStyle = dirt; ctx.fill();
  // Steinchen
  ctx.fillStyle = 'rgba(60,35,15,0.35)';
  for (let x = Math.floor(x0); x < x1; x += 1.7) {
    const k = Math.sin(x * 12.9898) * 43758.5453; const r = k - Math.floor(k);
    ctx.beginPath(); ctx.arc(sx(v, x + r), sy(v, terrain(x + r) - 0.5 - r * 1.5), 2 + r * 3, 0, Math.PI * 2); ctx.fill();
  }
  // Gras
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) { const X = sx(v, x), Y = sy(v, terrain(x)); x === x0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
  ctx.strokeStyle = '#4E9A45'; ctx.lineWidth = Math.max(8, ppm * 0.28); ctx.stroke();
  ctx.strokeStyle = '#7DC66B'; ctx.lineWidth = Math.max(3, ppm * 0.08); ctx.stroke();
  // Meter-Schilder
  for (let m = Math.ceil((x0 - 3) / 50) * 50; m < x1 - 3; m += 50) {
    if (m <= 0) continue;
    const X = sx(v, m + 3), Y = sy(v, terrain(m + 3));
    ctx.fillStyle = '#6B4A2B'; ctx.fillRect(X - 3, Y - ppm * 1.6, 6, ppm * 1.6);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#4A2424'; ctx.lineWidth = 3;
    const bw = ppm * 1.4, bh = ppm * 0.6;
    ctx.beginPath(); ctx.roundRect(X - bw / 2, Y - ppm * 1.6 - bh, bw, bh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4A2424'; ctx.font = `900 ${Math.round(ppm * 0.34)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${m} m`, X, Y - ppm * 1.6 - bh / 2);
  }
  // Rekord-Fahne
  if (best > 5 && best + 3 > x0 && best + 3 < x1) {
    const X = sx(v, best + 3), Y = sy(v, terrain(best + 3));
    ctx.fillStyle = '#4A2424'; ctx.fillRect(X - 2, Y - ppm * 2.4, 4, ppm * 2.4);
    ctx.fillStyle = '#E0352B'; ctx.beginPath(); ctx.moveTo(X + 2, Y - ppm * 2.4); ctx.lineTo(X + ppm * 1.3, Y - ppm * 2.1); ctx.lineTo(X + 2, Y - ppm * 1.8); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${Math.round(ppm * 0.26)}px Nunito, sans-serif`; ctx.textAlign = 'left';
    ctx.fillText('Rekord', X + 6, Y - ppm * 2.1);
  }
  // Sterne
  for (let i = s.nextStar; i < s.nextStar + 3; i++) {
    const wx = starX(i); if (wx > x1 + 2) break;
    const X = sx(v, wx), Y = sy(v, terrain(wx) + 1.6 + (reduced ? 0 : Math.sin(time * 3 + i) * 0.12));
    ctx.save(); ctx.shadowColor = 'rgba(255,214,90,0.9)'; ctx.shadowBlur = 16;
    star(ctx, X, Y, ppm * 0.42); ctx.fillStyle = '#F2B33D'; ctx.fill(); ctx.restore();
    star(ctx, X, Y, ppm * 0.42); ctx.strokeStyle = '#C98A12'; ctx.lineWidth = 2; ctx.stroke();
  }
  void STAR_EVERY;
  // Staub
  for (const p of particles) {
    ctx.fillStyle = `rgba(190,150,105,${Math.max(0, p.life) * 0.6})`;
    ctx.beginPath(); ctx.arc(sx(v, p.x), sy(v, p.y), p.size * ppm * (1.4 - p.life * 0.4), 0, Math.PI * 2); ctx.fill();
  }
  drawCar(ctx, v, s, spec, g, input.gas, time, reduced);
}

function drawCar(ctx: CanvasRenderingContext2D, v: View, s: CarState, spec: CarSpec, g: Garage, gas: boolean, time: number, reduced: boolean) {
  const shape = SHAPES[g.activeCar] ?? SHAPES.flitzer;
  const k = (spec.base / 43) * v.ppm; // Pfad-Einheiten → Pixel
  const v0 = 72 - (0.32 * 43) / spec.base; // Radhöhe = Aufhängung
  const X = sx(v, s.x), Y = sy(v, s.y);
  const outline = '#2A1A1A';
  // Karosserie
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(-s.a); ctx.scale(k, k); ctx.translate(-103, -v0);
  if (g.tuning.includes('turbo') && gas && !s.crashed) {
    const f = reduced ? 1 : 0.8 + Math.sin(time * 40) * 0.2;
    ctx.fillStyle = '#F2B33D'; ctx.beginPath(); ctx.moveTo(26, 60); ctx.lineTo(26 - 22 * f, 63); ctx.lineTo(26, 66); ctx.fill();
    ctx.fillStyle = '#E0352B'; ctx.beginPath(); ctx.moveTo(26, 61.5); ctx.lineTo(26 - 12 * f, 63); ctx.lineTo(26, 64.5); ctx.fill();
  }
  if (g.tuning.includes('spoiler')) { ctx.fillStyle = '#111111'; ctx.fillRect(26, 40, 22, 4); ctx.fillRect(34, 43, 3, 10); }
  // Fahrer (Helm in Gelb)
  const [dx, dy] = DRIVER[g.activeCar] ?? DRIVER.flitzer;
  ctx.fillStyle = '#F0C3A0'; ctx.beginPath(); ctx.arc(dx, dy + 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F2B33D'; ctx.beginPath(); ctx.arc(dx, dy, 6.5, Math.PI, 0); ctx.fill();
  ctx.fillStyle = shape === SHAPES.bus ? '#9FB3D9' : 'rgba(159,179,217,0.85)';
  ctx.fill(path(shape.win));
  ctx.fillStyle = g.color; ctx.strokeStyle = outline; ctx.lineWidth = 2.2 / Math.max(0.6, k / 3);
  ctx.fill(path(shape.body)); ctx.stroke(path(shape.body));
  ctx.fillStyle = 'rgba(159,179,217,0.55)'; ctx.fill(path(shape.win)); ctx.stroke(path(shape.win));
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(48, 58, 100, 3);
  ctx.restore();
  // Räder (an den Physik-Punkten, mit Felgen und Speichen)
  const rim = g.tuning.includes('felgen') ? '#F2B33D' : '#C9C9C9';
  for (const lx of [-spec.base, spec.base]) {
    const w = toWorld(s, lx, -0.32);
    const RX = sx(v, w.x), RY = sy(v, w.y), r = spec.wheelR * v.ppm;
    ctx.fillStyle = '#1C1C1C'; ctx.beginPath(); ctx.arc(RX, RY, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3A3A3A'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.beginPath(); ctx.arc(RX, RY, r * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(RX, RY, r * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1.5, r * 0.09);
    for (let i = 0; i < 5; i++) {
      const a = -s.spin + (i * Math.PI * 2) / 5;
      ctx.beginPath(); ctx.moveTo(RX, RY); ctx.lineTo(RX + Math.cos(a) * r * 0.5, RY + Math.sin(a) * r * 0.5); ctx.stroke();
    }
    ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(RX, RY, r * 0.14, 0, Math.PI * 2); ctx.fill();
  }
}

/** Staub hinter den Rädern beim Gasgeben. */
export function updateParticles(ps: Particle[], s: CarState, spec: CarSpec, gas: boolean, dt: number, reduced: boolean) {
  for (const p of ps) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.6 * dt; p.life -= dt * 1.4; }
  for (let i = ps.length - 1; i >= 0; i--) if (ps[i].life <= 0) ps.splice(i, 1);
  if (!gas || s.crashed || reduced || ps.length > 60) return;
  s.contact.forEach((c, i) => {
    if (!c || Math.random() > 0.5) return;
    const w = toWorld(s, i === 0 ? -spec.base : spec.base, -0.32);
    ps.push({ x: w.x - 0.2, y: w.y - spec.wheelR * 0.7, vx: -1 - Math.random() * 1.5 + s.vx * 0.2, vy: 0.4 + Math.random() * 0.8, life: 1, size: 0.12 + Math.random() * 0.12 });
  });
}
