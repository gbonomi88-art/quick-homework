import type { Cell, Kind } from './model';

/** Gebäude-Grafiken (viewBox 100×100). Strassen verbinden sich automatisch mit Nachbarn. */
export function Tile({ cell, roads, i }: { cell: Cell | null; roads?: [boolean, boolean, boolean, boolean]; i: number }) {
  if (!cell) return <Grass i={i} />;
  if (cell.t === 'road') return <Road n={roads ?? [false, false, false, false]} />;
  return <svg viewBox="0 0 100 100" aria-hidden="true"><Grass i={i} inner />{ART[cell.t](cell.l)}</svg>;
}

function Grass({ i, inner }: { i: number; inner?: boolean }) {
  const dots = [((i * 37) % 70) + 10, ((i * 53) % 70) + 15, ((i * 71) % 60) + 20];
  const g = <><rect width="100" height="100" fill="#8CC97E" />{dots.map((d, k) => <circle key={k} cx={d} cy={(d * (k + 3)) % 80 + 10} r="2.2" fill="#6FAE60" />)}</>;
  return inner ? g : <svg viewBox="0 0 100 100" aria-hidden="true">{g}</svg>;
}

function Road({ n }: { n: [boolean, boolean, boolean, boolean] }) {
  const [up, down, left, right] = n;
  const none = !up && !down && !left && !right;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#8CC97E" />
      <rect x="28" y="28" width="44" height="44" fill="#5A5A5A" />
      {(up || none) && <rect x="28" y="0" width="44" height="30" fill="#5A5A5A" />}
      {(down || none) && <rect x="28" y="70" width="44" height="30" fill="#5A5A5A" />}
      {(left || none) && <rect x="0" y="28" width="30" height="44" fill="#5A5A5A" />}
      {(right || none) && <rect x="70" y="28" width="30" height="44" fill="#5A5A5A" />}
      <g stroke="#F2E6A0" strokeWidth="3" strokeDasharray="8 7">
        {(up || none) && <line x1="50" y1="0" x2="50" y2="42" />}
        {(down || none) && <line x1="50" y1="58" x2="50" y2="100" />}
        {(left || none) && <line x1="0" y1="50" x2="42" y2="50" />}
        {(right || none) && <line x1="58" y1="50" x2="100" y2="50" />}
      </g>
    </svg>
  );
}

const shadow = (x: number, w: number) => <ellipse cx={x} cy="90" rx={w} ry="5" fill="rgba(0,0,0,0.15)" />;
const win = (x: number, y: number, s = 9) => <rect x={x} y={y} width={s} height={s} rx="1.5" fill="#BFE6F7" stroke="#5A4A3A" strokeWidth="1.2" />;

const ART: Record<Exclude<Kind, 'road'>, (l: number) => JSX.Element> = {
  house: (l) => l === 1 ? (
    <g>{shadow(50, 30)}<rect x="24" y="48" width="52" height="40" fill="#FCEDE1" /><path d="M16 50 L50 22 L84 50 Z" fill="#C8372D" />
      <rect x="44" y="66" width="12" height="22" fill="#8A3C0E" />{win(29, 58)}{win(62, 58)}</g>
  ) : l === 2 ? (
    <g>{shadow(50, 36)}<rect x="16" y="36" width="68" height="52" fill="#FFF4D6" /><path d="M10 38 L50 10 L90 38 Z" fill="#2F6BD8" />
      <rect x="44" y="68" width="12" height="20" fill="#8A3C0E" />{win(22, 46)}{win(38, 46)}{win(54, 46)}{win(70, 46)}{win(24, 70)}{win(68, 70)}</g>
  ) : (
    <g>{shadow(50, 40)}<rect x="66" y="8" width="8" height="18" fill="#7A3B2E" /><rect x="10" y="30" width="80" height="58" fill="#FDE7D2" /><path d="M5 32 L50 4 L95 32 Z" fill="#E07A1F" />
      <rect x="42" y="66" width="16" height="22" rx="7" fill="#8A3C0E" />{win(16, 40)}{win(30, 40)}{win(61, 40)}{win(75, 40)}{win(16, 58)}{win(30, 58)}{win(61, 58)}{win(75, 58)}
      <circle cx="27" cy="86" r="4" fill="#E0457B" /><circle cx="73" cy="86" r="4" fill="#F2B33D" /></g>
  ),
  tree: () => <g>{shadow(50, 22)}<rect x="45" y="56" width="10" height="32" fill="#8A5A00" /><circle cx="50" cy="42" r="26" fill="#2F8F4E" /><circle cx="40" cy="34" r="12" fill="#3BA85E" /><circle cx="62" cy="48" r="9" fill="#24723D" /></g>,
  shop: (l) => (
    <g>{shadow(50, 38)}<rect x="12" y={l > 1 ? 26 : 40} width="76" height={l > 1 ? 62 : 48} fill={l > 2 ? '#FFF0F7' : '#FFFFFF'} />
      {l > 1 && <>{win(20, 32)}{win(36, 32)}{win(55, 32)}{win(71, 32)}</>}
      <path d={`M8 ${l > 1 ? 50 : 42} h84 v10 h-84 z`} fill="#E0352B" />
      {[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M${8 + k * 14} ${l > 1 ? 60 : 52} q7 8 14 0`} fill={k % 2 ? '#E0352B' : '#FFFFFF'} stroke="#E0352B" strokeWidth="1" />)}
      <rect x="20" y="68" width="24" height="20" fill="#BFE6F7" stroke="#5A4A3A" strokeWidth="1.5" /><rect x="56" y="68" width="14" height="20" fill="#8A3C0E" />
      {l > 2 && <text x="50" y="22" textAnchor="middle" fontSize="13" fontWeight="900" fill="#C8372D">MEGA</text>}</g>
  ),
  park: () => (
    <g><rect x="6" y="6" width="88" height="88" rx="14" fill="#A9DC8F" /><circle cx="50" cy="50" r="16" fill="#7FC4EA" stroke="#C9C1B0" strokeWidth="4" />
      <circle cx="50" cy="44" r="4" fill="#FFFFFF" className="city-fountain" /><circle cx="22" cy="24" r="10" fill="#2F8F4E" /><circle cx="78" cy="76" r="10" fill="#2F8F4E" />
      {[[24, 74, '#E0457B'], [30, 80, '#F2B33D'], [74, 22, '#8A4FD8'], [80, 28, '#E0457B']].map(([x, y, c], k) => <circle key={k} cx={x as number} cy={y as number} r="3.5" fill={c as string} />)}</g>
  ),
  factory: (l) => (
    <g>{shadow(50, 40)}<rect x="62" y="12" width="12" height="40" fill="#7A7A7A" />{l > 1 && <rect x="44" y="20" width="10" height="32" fill="#7A7A7A" />}
      <g className="city-smoke"><circle cx="68" cy="8" r="6" fill="#D9D9D9" /><circle cx="76" cy="2" r="5" fill="#E8E8E8" /></g>
      <path d="M10 88 V48 l20 -12 v12 l20 -12 v12 l20 -12 v12 l20 0 V88 Z" fill={l > 1 ? '#8D6E63' : '#A1887F'} />
      {win(18, 60, 10)}{win(36, 60, 10)}{win(54, 60, 10)}{win(72, 60, 10)}</g>
  ),
  school: () => (
    <g>{shadow(50, 42)}<rect x="8" y="42" width="84" height="46" fill="#F2C94C" /><rect x="38" y="16" width="24" height="30" fill="#E0A82E" /><path d="M34 18 L50 4 L66 18 Z" fill="#C8372D" />
      <circle cx="50" cy="30" r="7" fill="#FFFFFF" stroke="#5A4A3A" strokeWidth="1.5" /><path d="M50 30 v-5 M50 30 h4" stroke="#5A4A3A" strokeWidth="1.5" />
      {win(14, 52)}{win(28, 52)}{win(63, 52)}{win(77, 52)}<rect x="43" y="66" width="14" height="22" fill="#8A3C0E" /></g>
  ),
  tower: (l) => (
    <g>{shadow(50, 26)}{l > 1 && <line x1="50" y1="0" x2="50" y2="10" stroke="#5A5A5A" strokeWidth="3" />}
      <rect x="26" y={l > 1 ? 8 : 18} width="48" height={l > 1 ? 80 : 70} fill={l > 1 ? '#6E8FCB' : '#9FB3D9'} />
      {Array.from({ length: l > 1 ? 8 : 7 }, (_, r) => [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={32 + c * 13} y={(l > 1 ? 13 : 23) + r * 9.5} width="9" height="6" fill={(r + c) % 3 ? '#FFE58A' : '#DDE7F7'} />))}</g>
  ),
  stadium: () => (
    <g><ellipse cx="50" cy="52" rx="44" ry="36" fill="#B0B7C6" /><ellipse cx="50" cy="52" rx="34" ry="26" fill="#5BB054" /><rect x="34" y="40" width="32" height="24" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="50" y1="40" x2="50" y2="64" stroke="#FFFFFF" strokeWidth="2" /><circle cx="50" cy="52" r="5" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      {[14, 86].map((x) => <g key={x}><line x1={x} y1="6" x2={x} y2="26" stroke="#5A5A5A" strokeWidth="3" /><rect x={x - 6} y="2" width="12" height="7" fill="#FFF2A0" /></g>)}</g>
  ),
  wheel: () => (
    <g>{shadow(50, 30)}<path d="M50 50 L28 92 M50 50 L72 92" stroke="#5A5A5A" strokeWidth="5" />
      <g className="city-wheel"><circle cx="50" cy="48" r="38" fill="none" stroke="#E0352B" strokeWidth="4" />
        {Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return <g key={k}><line x1="50" y1="48" x2={50 + Math.cos(a) * 38} y2={48 + Math.sin(a) * 38} stroke="#C9C1B0" strokeWidth="2" /><circle cx={50 + Math.cos(a) * 38} cy={48 + Math.sin(a) * 38} r="6" fill={['#F2B33D', '#2F6BD8', '#4CAF50', '#E0457B'][k % 4]} /></g>; })}
      </g><circle cx="50" cy="48" r="5" fill="#5A5A5A" /></g>
  ),
  rocket: () => (
    <g><rect x="14" y="80" width="72" height="12" fill="#7A7A7A" /><path d="M24 80 V40 h6 V80" fill="#C8372D" /><path d="M76 80 V40 h-6 V80" fill="#C8372D" />
      <g className="city-rocket"><path d="M50 4 C64 20 64 50 60 74 H40 C36 50 36 20 50 4 Z" fill="#EDEDED" stroke="#9A9A9A" strokeWidth="1.5" /><circle cx="50" cy="34" r="7" fill="#4FA3E0" stroke="#2F6BD8" strokeWidth="2" />
        <path d="M40 60 L30 78 H40 Z M60 60 L70 78 H60 Z" fill="#C8372D" /><path d="M44 74 L50 88 L56 74 Z" fill="#FFB020" /></g></g>
  ),
};

export function KindIcon({ kind }: { kind: Kind }) {
  if (kind === 'road') return <Road n={[false, false, true, true]} />;
  return <svg viewBox="0 0 100 100" aria-hidden="true">{ART[kind](1)}</svg>;
}
