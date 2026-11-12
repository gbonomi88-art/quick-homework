export type SubjectId = 'nmg' | 'mathe' | 'deutsch' | 'franz' | 'englisch';
export type TaskKind = 'compare' | 'question' | 'transform';
export type GameId = 'auto' | 'bau' | 'huepf' | 'tor';
export type Weekday = 0 | 1 | 2 | 3 | 4;
export type WeekOffset = -1 | 0 | 1;

// HINWEIS: Showcase. Passwörter liegen im Klartext im Browser.
// Ein echtes Produkt braucht Passwort-Hashing und Server-Authentifizierung.
export interface Student {
  id: string;
  name: string;
  password: string;
  coins: number;
  forgottenThisMonth: number;
  skipNextGame: boolean;
  lockedUntilPositive: boolean;
  photo?: string;
  isNew?: boolean;
}

export type Task =
  | { kind: 'compare'; left: string; right: string; solution: '<' | '>' | '=' }
  | { kind: 'question'; question: string; sampleSolution?: string; placeholder?: string }
  | { kind: 'transform'; word: string; prefix: string; solution: string };

export interface Homework {
  id: string;
  subject: SubjectId;
  title: string;
  instruction: string;
  dueWeekday: Weekday;
  /** Ergänzung zur Spezifikation: Woche der Abgabe relativ zu DEMO_TODAY. */
  dueWeekOffset: WeekOffset;
  important: boolean;
  kind: TaskKind;
  tasks: Task[];
  hausiTip?: string;
  createdBy: 'teacher';
}

export type SubmissionStatus = 'offen' | 'abgegeben' | 'korrigiert' | 'nichtgemacht';

export interface Submission {
  id: string;
  homeworkId: string;
  studentId: string;
  answers: string[];
  status: SubmissionStatus;
  grading?: boolean[];
  comment?: string;
  /** Spielgeld, das insgesamt für diese Abgabe gebucht wurde. */
  reward?: number;
  /** Betrag beim Abgeben (Basis für den Fehlerfrei-Bonus). */
  baseReward?: number;
  seenByStudent?: boolean;
  /** 1 Spiel pro Abgabe: true, sobald die Belohnung eingelöst oder verfallen ist. */
  rewardUsed?: boolean;
}

export type EventType = 'test' | 'bib' | 'ausflug' | 'sonst';

export interface AgendaEvent {
  id: string;
  weekOffset: WeekOffset;
  weekday: Weekday;
  type: EventType;
  time?: string;
  title: string;
  note?: string;
}

export interface Settings {
  coinsPerSubmission: number;
  allowedGames: GameId[];
  maxMinutes: number;
  startImage?: string;
  hausiTeacherCanRead: boolean;
  hausiSchoolTopicsOnly: boolean;
}

export interface Garage {
  ownedCars: string[];
  activeCar: string;
  color: string;
  tuning: string[];
  /** Weitester Meter-Rekord in der Auto-Welt. */
  best?: number;
}

export interface ChatMessage {
  from: 'kid' | 'hausi';
  text: string;
}

export interface GameSession {
  submissionId: string;
  game: GameId;
  startedAt: number;
  /** Nur Showcase: vorgespulte Millisekunden. */
  skippedMs: number;
}

export interface DemoData {
  /** Montag der aktuellen Woche (ISO) + heutiger Wochentag; fehlt = Demo-Kalender. */
  calendar?: { monday: string; weekday: number };
  students: Student[];
  homeworks: Homework[];
  submissions: Submission[];
  events: AgendaEvent[];
  settings: Settings;
  teacher: { name: string; login: string; password: string; photo?: string };
  garages: Record<string, Garage>;
  chats: Record<string, ChatMessage[]>; // key: studentId:homeworkId
  gameSession?: GameSession;
  buildCity: Record<string, string[]>; // studentId -> 60 Felder (alter Baumeister)
  /** Spielstände pro Kind und Spiel (Rekorde, Freischaltungen, Stadt). */
  progress?: Record<string, Partial<Record<'bau' | 'huepf' | 'tor', unknown>>>;
}
