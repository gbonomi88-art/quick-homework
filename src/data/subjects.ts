import type { SubjectId } from '../store/types';

export interface SubjectMeta {
  id: SubjectId;
  label: string;
  dark: string;
  light: string;
  text: string;
  /** Hintergrund der Karte in der Übersicht. */
  cardBg: string;
  /** dunkle Titelfarbe im Fach-Kopf / Nebentext */
  title: string;
  muted: string;
  lang?: 'fr-FR' | 'en-GB';
  greeting: string;
  praise: [string, string, string, string, string];
}

const DE_PRAISE: SubjectMeta['praise'] = ['Los geht’s!', 'Super Start!', 'Weiter so!', 'Fast geschafft!', 'Alles fertig – toll!'];

export const SUBJECTS: Record<SubjectId, SubjectMeta> = {
  nmg: { id: 'nmg', label: 'NMG', dark: '#2F7D4F', light: '#DCEFE2', text: '#1E5E37', cardBg: '#EAF5EE', title: '#17432A', muted: '#3D5E47',
    greeting: 'Hallo!', praise: DE_PRAISE },
  mathe: { id: 'mathe', label: 'Mathe', dark: '#1F4E8C', light: '#DDE7F7', text: '#1F4E8C', cardBg: '#E8EFFA', title: '#16345E', muted: '#3B5478',
    greeting: 'Hallo!', praise: DE_PRAISE },
  deutsch: { id: 'deutsch', label: 'Deutsch', dark: '#B5541B', light: '#FCEDE1', text: '#8A3C0E', cardBg: '#FCEDE1', title: '#5E2A0A', muted: '#66503F',
    greeting: 'Hallo!', praise: DE_PRAISE },
  franz: { id: 'franz', label: 'Französisch', dark: '#4B3C99', light: '#ECE8FA', text: '#3D2F85', cardBg: '#ECE8FA', title: '#2E2266', muted: '#514A70',
    lang: 'fr-FR', greeting: 'Bonjour!', praise: ['Allez!', 'Très bien!', 'Super!', 'Fast geschafft!', 'Bravo – alles fertig!'] },
  englisch: { id: 'englisch', label: 'Englisch', dark: '#0E6B73', light: '#E0F2F3', text: '#0B5560', cardBg: '#E0F2F3', title: '#0A4248', muted: '#3E5E61',
    lang: 'en-GB', greeting: 'Hello!', praise: ['Let’s go!', 'Good start!', 'Well done!', 'Almost there!', 'Great job – fertig!'] },
};

export const SUBJECT_ORDER: SubjectId[] = ['nmg', 'mathe', 'deutsch', 'franz', 'englisch'];

/** Die vier hellen Aufgaben-Kartenfarben (hell, dunkel für die Nummer). */
export const TASK_COLORS: [string, string][] = [['#FDE8E4', '#B03A2E'], ['#E3F1E7', '#1E5E37'], ['#FFF1CC', '#8A5A00'], ['#E8E4F7', '#4B3C99']];

export const EVENT_TYPES = {
  test: { label: 'Test', light: '#FDE2DF', dark: '#B03A2E' },
  bib: { label: 'Bibliothek', light: '#DDE7F7', dark: '#1F4E8C' },
  ausflug: { label: 'Ausflug', light: '#DCEFE2', dark: '#1E5E37' },
  sonst: { label: 'Sonstiges', light: '#FFF1CC', dark: '#8A5A00' },
  abgabe: { label: 'Abgabe', light: '#F1ECE7', dark: '#5E4C47' },
} as const;

export const GAMES = {
  auto: { name: 'Auto-Welt', desc: 'Fahr über Hügel und Schanzen, kauf Autos und tune sie – aber kipp nicht um!', color: '#C8372D', bg: '#FBE1DE' },
  bau: { name: 'Baumeister', desc: 'Baue deine eigene Stadt mit Kran und Bagger.', color: '#8A5A00', bg: '#FCE9BE' },
  huepf: { name: 'Hüpf-Held', desc: 'Springe über Plattformen und sammle Sterne.', color: '#1F4E8C', bg: '#DDE7F7' },
  tor: { name: 'Torschuss', desc: 'Schiesse Penaltys und treffe ins Tor.', color: '#1E5E37', bg: '#DCEFE2' },
} as const;
