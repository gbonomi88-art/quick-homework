import { hausiBig, hausiWave } from './designSvgs';

/** Hausi: freundlicher gelber Roboter (SVG aus dem Design). */
export function HausiBig({ size = 56, label = 'Hausi, ein freundlicher Roboter' }: { size?: number; label?: string }) {
  return <span role="img" aria-label={label} className="hausi-svg" style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
    dangerouslySetInnerHTML={{ __html: hausiBig.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`) }} />;
}
export function HausiWave({ size = 64 }: { size?: number }) {
  return <span role="img" aria-label="Hausi winkt" className="hausi-wave" style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
    dangerouslySetInnerHTML={{ __html: hausiWave.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`) }} />;
}
/** Kleiner Kopf neben jeder Hausi-Nachricht. */
export function HausiHead({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <rect x="8" y="12" width="32" height="29" rx="12" fill="#F2B33D" stroke="#4A2424" strokeWidth="2.5" />
      <circle cx="24" cy="6" r="3.5" fill="#E0352B" /><rect x="22.8" y="8" width="2.4" height="5" fill="#4A2424" />
      <circle cx="18" cy="25" r="3.5" fill="#2A1A1A" /><circle cx="30" cy="25" r="3.5" fill="#2A1A1A" />
      <path d="M19 32 Q24 36.5 29 32" stroke="#4A2424" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
