import type { SubjectId } from '../store/types';

type P = { size?: number; className?: string };
const S = ({ size = 24, children, sw = 2.2, className }: P & { children: React.ReactNode; sw?: number }) => (
  <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export const IconChat = (p: P) => <S {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></S>;
export const IconBell = (p: P) => <S {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></S>;
export const IconChevronRight = (p: P) => <S sw={2.5} {...p}><path d="M9 6l6 6-6 6" /></S>;
export const IconBack = (p: P) => <S sw={2.5} {...p}><path d="M15 6l-6 6 6 6" /></S>;
export const IconArrowRight = (p: P) => <S sw={2.5} {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></S>;
export const IconCheck = (p: P) => <S sw={2.8} {...p}><path d="M5 12l5 5 9-10" /></S>;
export const IconX = (p: P) => <S sw={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IconLock = (p: P) => <S sw={2.4} {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></S>;
export const IconCalendar = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></S>;
export const IconCamera = (p: P) => <S sw={2.4} {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></S>;
export const IconImage = (p: P) => <S sw={1.8} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-9 8" /></S>;
export const IconSpeaker = (p: P) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></S>;
export const IconSend = IconArrowRight;
export const IconPlay = ({ size = 22 }: P) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z" /></svg>
);

/** Münze: gelber Kreis mit Stern (kein Kreuz, kein Plus). */
export const Coin = ({ size = 28 }: P) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill="#F2B33D" /><circle cx="12" cy="12" r="7" fill="none" stroke="#C98A12" strokeWidth="1.5" />
    <path d="M12 7.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#8A5A00" />
  </svg>
);

const Bubble = ({ size = 36, text }: P & { text: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
    <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 11.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <text x="12.6" y="14.6" textAnchor="middle" fontFamily="Nunito, sans-serif" fontSize="7.5" fontWeight="900" fill="currentColor">{text}</text>
  </svg>
);

export function SubjectIcon({ subject, size = 34 }: { subject: SubjectId; size?: number }) {
  switch (subject) {
    case 'nmg': return <S size={size} sw={2}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></S>;
    case 'mathe': return <S size={size}><path d="M4 8h6M7 5v6" /><path d="M14 14l5 5M19 14l-5 5" /><path d="M14 7h5" /><path d="M4.5 16.5h5M4.5 19h5" /></S>;
    case 'deutsch': return <S size={size} sw={2}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M9 8h7M9 11.5h5" /></S>;
    case 'franz': return <Bubble size={size + 2} text="FR" />;
    case 'englisch': return <Bubble size={size + 2} text="EN" />;
  }
}
