import { GOAL_H, GOAL_W, SPOT, WALL_Z, type KickState } from './engine';
import type { BallSkin } from './meta';

export interface KView { W: number; H: number; f: number; cx: number; hz: number; camZ: number; camH: number }
const CAM_BACK = 5.2, CAM_H = 1.8;

export function layoutKick(v: KView) {
  const frac = v.W < 700 ? 0.86 : 0.55;
  const k = (Math.min(v.W, v.H * 1.45) * frac) / (GOAL_W * 2);
  v.camZ = SPOT + CAM_BACK; v.camH = CAM_H;
  v.f = k * (SPOT + CAM_BACK);
  v.cx = v.W / 2;
  v.hz = v.H * (v.W > v.H ? 0.46 : 0.47) - CAM_H * k;
}
export function project(v: KView, x: number, y: number, z: number) {
  const d = Math.max(0.3, v.camZ - z);
  const s = v.f / d;
  return { x: v.cx + x * s, y: v.hz + (v.camH - y) * s, s };
}
/** Bildschirmpunkt → Punkt im Tor (z = 0). */
export function unprojectGoal(v: KView, px: number, py: number) {
  const s = v.f / v.camZ;
  return { x: (px - v.cx) / s, y: v.camH - (py - v.hz) / s };
}

const hash = (n: number) => { const x = Math.sin(n * 91.7) * 43758.5453; return x - Math.floor(x); };
const KEEPER_COLORS = ['#F2C94C', '#4CAF50', '#8A4FD8', '#2B2F3A', '#E0352B'];

export function drawKick(ctx: CanvasRenderingContext2D, v: KView, s: KickState, ball: BallSkin, time: number, cheer: number, aim: { x: number; y: number } | null, trail: { x: number; y: number; z: number }[], reduced: boolean) {
  const { W, H } = v;
  const P = (x: number, y: number, z: number) => project(v, x, y, z);
  // Himmel und Flutlicht
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#20345E'); g.addColorStop(0.5, '#3E5C93'); g.addColorStop(1, '#3E5C93');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Tribüne mit Publikum
  const standTop = Math.max(0, v.hz - (H * 0.28)), standBot = P(0, 0, -6).y;
  ctx.fillStyle = '#2A2F45'; ctx.fillRect(0, standTop, W, standBot - standTop);
  const rows = 9, cols = Math.ceil(W / 16);
  const colors = ['#E0352B', '#FFFFFF', '#F2C94C', '#2F6BD8', '#4CAF50', '#F08A24', '#E8B4D0'];
  for (let r = 0; r < rows; r++) {
    const y = standTop + ((r + 0.5) * (standBot - standTop)) / rows;
    for (let c = 0; c < cols; c++) {
      const i = r * 131 + c;
      const jump = cheer > 0 && !reduced ? Math.abs(Math.sin(time * 14 + i)) * 6 * cheer : 0;
      ctx.fillStyle = colors[Math.floor(hash(i) * colors.length)];
      ctx.fillRect(c * 16 + (r % 2) * 8 + 3, y - 4 - jump, 9, 9);
    }
  }
  // Werbebande
  const bandY = P(0, 0, -6).y, bandH = P(0, 0.9, -6).y;
  ctx.fillStyle = '#C8372D'; ctx.fillRect(0, bandH, W, bandY - bandH);
  ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${Math.max(12, (bandY - bandH) * 0.6)}px Nunito, sans-serif`; ctx.textBaseline = 'middle';
  const label = 'QUICK HOMEWORK  ★  ', step = ctx.measureText(label).width;
  for (let x = -((time * (reduced ? 0 : 30)) % step); x < W; x += step) ctx.fillText(label, x, (bandY + bandH) / 2);
  ctx.textBaseline = 'alphabetic';
  // Rasen mit Streifen
  for (let i = -1; i < 12; i++) {
    const z0 = -6 + i * 2.2, z1 = z0 + 2.2;
    const a = P(-30, 0, z0), b = P(30, 0, z0), c = P(30, 0, Math.min(z1, v.camZ - 0.4)), d = P(-30, 0, Math.min(z1, v.camZ - 0.4));
    ctx.fillStyle = i % 2 ? '#4FA04A' : '#5BB054';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
  }
  // Linien
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
  const line = (pts: [number, number][]) => { ctx.beginPath(); pts.forEach(([x, z], i) => { const p = P(x, 0, z); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); };
  line([[-30, 0], [30, 0]]);
  line([[-9.16, 0], [-9.16, 5.5], [9.16, 5.5], [9.16, 0]]);
  line([[-20.16, 0], [-20.16, 16.5], [20.16, 16.5], [20.16, 0]]);
  const spot = P(0, 0, SPOT); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(spot.x, spot.y, spot.s * 0.12, spot.s * 0.05, 0, 0, 7); ctx.fill();

  // Tor: Netz hinten
  const depth = -1.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
  for (let x = -GOAL_W; x <= GOAL_W + 0.01; x += 0.3) { const a = P(x, GOAL_H * 0.85, depth), b = P(x, 0, depth); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let y = 0; y <= GOAL_H * 0.85; y += 0.3) { const a = P(-GOAL_W, y, depth), b = P(GOAL_W, y, depth); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const sx of [-GOAL_W, GOAL_W]) for (let y = 0; y <= GOAL_H; y += 0.3) { const a = P(sx, y, 0), b = P(sx, y * 0.85, depth); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let x = -GOAL_W; x <= GOAL_W + 0.01; x += 0.3) { const a = P(x, GOAL_H, 0), b = P(x, GOAL_H * 0.85, depth); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

  const f = s.flight;
  const items: { z: number; draw: () => void }[] = [];
  // Pfosten
  items.push({ z: 0, draw: () => {
    const a = P(-GOAL_W, 0, 0), b = P(-GOAL_W, GOAL_H, 0), c = P(GOAL_W, GOAL_H, 0), d = P(GOAL_W, 0, 0);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(4, a.s * 0.12); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
  } });
  // Zielscheibe
  const t = s.target;
  if (t) items.push({ z: 0.02, draw: () => {
    const p = P(t.x, t.y, 0.02), r = t.r * p.s;
    const hit = f?.targetHit;
    ['#C8372D', '#FFFFFF', '#C8372D', '#FFFFFF'].forEach((c, i) => { ctx.fillStyle = hit ? (i % 2 ? '#FFF2A0' : '#F2B33D') : c; ctx.beginPath(); ctx.arc(p.x, p.y, r * (1 - i * 0.25), 0, 7); ctx.fill(); });
    ctx.fillStyle = '#C8372D'; ctx.font = `900 ${Math.max(11, r * 0.5)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('+150', p.x, p.y - r - 6); ctx.textAlign = 'left';
  } });
  // Torhüter
  const k = s.keeper;
  items.push({ z: 0.35, draw: () => {
    const p = P(k.x, k.y, 0.35), m = p.s;
    const col = KEEPER_COLORS[Math.min(KEEPER_COLORS.length - 1, Math.floor((s.level - 1) / 2))];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(k.lean * 0.75);
    // Beine
    ctx.fillStyle = '#1F2A44'; ctx.fillRect(-0.28 * m, -0.9 * m, 0.22 * m, 0.9 * m); ctx.fillRect(0.06 * m, -0.9 * m, 0.22 * m, 0.9 * m);
    // Körper
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-0.36 * m, -1.62 * m, 0.72 * m, 0.8 * m, 0.14 * m); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.font = `900 ${0.36 * m}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('1', 0, -1.1 * m); ctx.textAlign = 'left';
    // Arme
    const armUp = Math.min(1, Math.abs(k.lean) + (k.y > 0 ? 0.6 : 0.2));
    ctx.strokeStyle = col; ctx.lineWidth = 0.16 * m; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const hx = sd * (0.75 - armUp * 0.25) * m, hy = (-1.35 - armUp * 0.75) * m;
      ctx.beginPath(); ctx.moveTo(sd * 0.3 * m, -1.5 * m); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#F2F2F2'; ctx.beginPath(); ctx.arc(hx, hy, 0.13 * m, 0, 7); ctx.fill();
    }
    // Kopf
    ctx.fillStyle = '#F1C9A5'; ctx.beginPath(); ctx.arc(0, -1.85 * m, 0.22 * m, 0, 7); ctx.fill();
    ctx.fillStyle = '#5A3A1A'; ctx.beginPath(); ctx.arc(0, -1.92 * m, 0.22 * m, Math.PI, 0); ctx.fill();
    ctx.restore();
  } });
  // Mauer
  const w = s.wall;
  if (w) items.push({ z: WALL_Z, draw: () => {
    const jump = f && !f.done && f.z < WALL_Z + 4 ? w.jump : 0;
    for (let i = 0; i < w.n; i++) {
      const x = w.x - (w.n - 1) * 0.3 + i * 0.6;
      const p = P(x, jump, WALL_Z), m = p.s;
      ctx.fillStyle = '#1F2A44'; ctx.fillRect(p.x - 0.2 * m, p.y - 0.85 * m, 0.4 * m, 0.85 * m);
      ctx.fillStyle = '#2F6BD8'; ctx.beginPath(); ctx.roundRect(p.x - 0.27 * m, p.y - 1.55 * m, 0.54 * m, 0.75 * m, 0.1 * m); ctx.fill();
      ctx.fillStyle = '#F1C9A5'; ctx.beginPath(); ctx.arc(p.x, p.y - 1.72 * m, 0.17 * m, 0, 7); ctx.fill();
      ctx.fillStyle = hash(i + 3) > 0.5 ? '#2B2B2B' : '#C98A12'; ctx.beginPath(); ctx.arc(p.x, p.y - 1.78 * m, 0.17 * m, Math.PI, 0); ctx.fill();
    }
  } });
  // Ball mit Schatten und Spur
  const bx = f ? f.x : 0, by = f ? f.y : 0.11, bz = f ? f.z : SPOT;
  items.push({ z: bz, draw: () => {
    const sh = P(bx, 0, bz);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.13 * sh.s, 0.05 * sh.s, 0, 0, 7); ctx.fill();
    trail.forEach((q, i) => {
      const p = P(q.x, q.y, q.z), a = (i + 1) / trail.length;
      ctx.fillStyle = ball.trail === 'rainbow' ? `hsla(${(i * 40 + time * 300) % 360},90%,60%,${a * 0.6})` : ball.trail.replace(/[\d.]+\)$/, `${a * 0.6})`);
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.11 * p.s * a, 0, 7); ctx.fill();
    });
    const p = P(bx, by, bz), r = 0.11 * p.s;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = ball.base; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.clip();
    const spin = f && !f.done ? f.t * 25 : 0;
    for (let i = 0; i < 5; i++) {
      const a = spin + (i * Math.PI * 2) / 5;
      ctx.fillStyle = ball.patch === 'rainbow' ? `hsl(${i * 72},85%,55%)` : ball.patch;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, r * 0.32, 0, 7); ctx.fill();
    }
    ctx.fillStyle = ball.patch === 'rainbow' ? '#F2B33D' : ball.patch; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
  } });
  items.sort((a, b) => a.z - b.z).forEach((it) => it.draw());

  // Zielkreuz (Tastatur/Tippen)
  if (aim && !f) {
    const p = P(aim.x, aim.y, 0);
    ctx.strokeStyle = '#FFE58A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, 7); ctx.moveTo(p.x - 24, p.y); ctx.lineTo(p.x + 24, p.y); ctx.moveTo(p.x, p.y - 24); ctx.lineTo(p.x, p.y + 24); ctx.stroke();
  }
}
