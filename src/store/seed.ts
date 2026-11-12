import type { DemoData, Homework, Submission, Student } from './types';

const student = (id: string, name: string, password: string, coins: number): Student => ({
  id, name, password, coins, forgottenThisMonth: 0, skipNextGame: false, lockedUntilPositive: false,
});

export const SEED_HOMEWORKS: Homework[] = [
  {
    id: 'hw-nmg', subject: 'nmg', title: 'Energie und Strom', instruction: 'Beantworte die Fragen in ganzen Sätzen.',
    dueWeekday: 1, dueWeekOffset: 0, important: true, kind: 'question', createdBy: 'teacher',
    hausiTip: 'Denk an die Sonne, den Wind oder einen Fluss. Was davon kann man nutzen, um Strom zu machen?',
    tasks: [
      { kind: 'question', question: 'Nenne zwei Geräte bei dir zu Hause, die Strom brauchen.' },
      { kind: 'question', question: 'Woher kommt Strom? Nenne eine Energiequelle.' },
      { kind: 'question', question: 'Warum soll man das Licht ausschalten, wenn man das Zimmer verlässt?' },
      { kind: 'question', question: 'Was leitet Strom besser: Holz oder Metall?', sampleSolution: 'Metall' },
    ],
  },
  {
    id: 'hw-mathe', subject: 'mathe', title: 'Brüche und Dezimalzahlen vergleichen',
    instruction: 'Setze das richtige Zeichen ein: < (kleiner), > (grösser) oder = (gleich).',
    dueWeekday: 2, dueWeekOffset: 0, important: false, kind: 'compare', createdBy: 'teacher',
    hausiTip: 'Mach aus dem Bruch eine Dezimalzahl. Rechne oben : unten.',
    tasks: [
      { kind: 'compare', left: '1/2', right: '0,5', solution: '=' },
      { kind: 'compare', left: '3/4', right: '0,7', solution: '>' },
      { kind: 'compare', left: '0,25', right: '1/3', solution: '<' },
      { kind: 'compare', left: '2/5', right: '0,6', solution: '<' },
    ],
  },
  {
    id: 'hw-franz', subject: 'franz', title: 'Vokabeln: Les animaux',
    instruction: 'Übersetze die Tiere ins Deutsche – mit Artikel (der, die, das).',
    dueWeekday: 3, dueWeekOffset: 0, important: false, kind: 'question', createdBy: 'teacher',
    tasks: [
      { kind: 'question', question: 'le chien', sampleSolution: 'der Hund' },
      { kind: 'question', question: 'le chat', sampleSolution: 'die Katze' },
      { kind: 'question', question: 'l’oiseau', sampleSolution: 'der Vogel' },
      { kind: 'question', question: 'le cheval', sampleSolution: 'das Pferd' },
    ],
  },
  {
    id: 'hw-deutsch', subject: 'deutsch', title: 'Verben in der Vergangenheit',
    instruction: 'Schreib das Verb in der Vergangenheit (Präteritum).',
    dueWeekday: 4, dueWeekOffset: 0, important: false, kind: 'transform', createdBy: 'teacher',
    tasks: [
      { kind: 'transform', word: 'ich gehe', prefix: 'ich', solution: 'ging' },
      { kind: 'transform', word: 'du spielst', prefix: 'du', solution: 'spieltest' },
      { kind: 'transform', word: 'wir lesen', prefix: 'wir', solution: 'lasen' },
      { kind: 'transform', word: 'er singt', prefix: 'er', solution: 'sang' },
    ],
  },
  {
    id: 'hw-englisch', subject: 'englisch', title: 'My Day',
    instruction: 'Answer the questions in English. Beginne mit «I …».',
    dueWeekday: 4, dueWeekOffset: 0, important: false, kind: 'question', createdBy: 'teacher',
    tasks: [
      { kind: 'question', question: 'What time do you get up?', placeholder: 'I get up at …' },
      { kind: 'question', question: 'What do you eat for breakfast?', placeholder: 'I eat …' },
      { kind: 'question', question: 'How do you go to school?', placeholder: 'I go to school by …' },
      { kind: 'question', question: 'What do you do after school?', placeholder: 'After school I …' },
    ],
  },
  {
    id: 'hw-mal', subject: 'mathe', title: 'Malrechnungen bis 100', instruction: 'Rechne aus.',
    dueWeekday: 2, dueWeekOffset: -1, important: false, kind: 'question', createdBy: 'teacher',
    tasks: [
      { kind: 'question', question: '7 × 8', sampleSolution: '56' },
      { kind: 'question', question: '6 × 9', sampleSolution: '54' },
      { kind: 'question', question: '4 × 12', sampleSolution: '48' },
      { kind: 'question', question: '9 × 9', sampleSolution: '81' },
    ],
  },
];

export const STUDENT_IDS = ['mattia', 'lina', 'noah', 'elif', 'luca'];

function seedSubmissions(): Submission[] {
  const subs: Submission[] = [];
  const mal: Record<string, { answers: string[]; grading: boolean[]; comment: string }> = {
    mattia: { answers: ['56', '54', '46', '81'], grading: [true, true, false, true],
      comment: 'Toll gemacht, Mattia! Bei 4 × 12 schau nochmal genau hin: 4 × 10 = 40 – und wie viel ist 4 × 2?' },
    lina: { answers: ['56', '45', '48', '81'], grading: [true, false, true, true], comment: 'Gut gemacht! Schau dir 6 × 9 nochmal an.' },
    noah: { answers: ['56', '54', '48', '72'], grading: [true, true, true, false], comment: 'Fast alles richtig – 9 × 9 nochmal üben.' },
    elif: { answers: ['56', '54', '48', '81'], grading: [true, true, true, true], comment: 'Fehlerfrei – super!' },
    luca: { answers: ['54', '54', '48', '81'], grading: [false, true, true, true], comment: 'Bei 7 × 8 nochmal nachrechnen.' },
  };
  for (const sid of STUDENT_IDS) {
    const m = mal[sid];
    const perfect = m.grading.every(Boolean);
    subs.push({ id: `sub-hw-mal-${sid}`, homeworkId: 'hw-mal', studentId: sid, answers: m.answers, status: 'korrigiert',
      grading: m.grading, comment: m.comment, baseReward: 150, reward: perfect ? 300 : 150,
      seenByStudent: sid !== 'mattia', rewardUsed: true });
  }
  const submittedNmg = ['lina', 'noah', 'elif'];
  for (const hw of SEED_HOMEWORKS.filter((h) => h.dueWeekOffset === 0)) {
    for (const sid of STUDENT_IDS) {
      const done = hw.id === 'hw-nmg' && submittedNmg.includes(sid);
      subs.push({
        id: `sub-${hw.id}-${sid}`, homeworkId: hw.id, studentId: sid,
        answers: done
          ? ['Kühlschrank und Fernseher.', 'Aus der Sonne mit Solarzellen.', 'Damit man keinen Strom verschwendet.', 'Metall leitet Strom besser.']
          : hw.tasks.map(() => ''),
        status: done ? 'abgegeben' : 'offen',
        ...(done ? { baseReward: 150, reward: 150, rewardUsed: true } : {}),
      });
    }
  }
  return subs;
}

export function createSeed(): DemoData {
  return {
    students: [
      student('mattia', 'Mattia', 'Sonne2026', 900),
      student('lina', 'Lina', 'Mond2026', 450),
      student('noah', 'Noah', 'Wolke17', 400),
      student('elif', 'Elif', 'Blitz88', 450),
      student('luca', 'Luca', 'Stern55', 400),
    ],
    homeworks: structuredClone(SEED_HOMEWORKS),
    submissions: seedSubmissions(),
    events: [
      { id: 'e1', weekOffset: -1, weekday: 1, type: 'test', time: '09:00', title: 'Deutsch-Test: Nomen und Artikel' },
      { id: 'e2', weekOffset: -1, weekday: 3, type: 'bib', time: '10:00', title: 'Bibliothek', note: 'Neues Buch ausleihen.' },
      { id: 'e3', weekOffset: -1, weekday: 4, type: 'sonst', time: '08:00', title: 'Sporttag', note: 'Turnsachen und Trinkflasche mitnehmen.' },
      { id: 'e4', weekOffset: 0, weekday: 0, type: 'bib', time: '10:00', title: 'Bibliothek', note: 'Ausgeliehene Bücher mitbringen.' },
      { id: 'e5', weekOffset: 0, weekday: 2, type: 'test', time: '08:15', title: 'Mathe-Test: Brüche und Dezimalzahlen', note: 'Lernen: Seite 34–37' },
      { id: 'e6', weekOffset: 0, weekday: 3, type: 'test', time: '13:30', title: 'Französisch: Vokabeltest', note: 'Les animaux' },
      { id: 'e7', weekOffset: 0, weekday: 4, type: 'ausflug', time: '09:00', title: 'Besuch im Wasserkraftwerk', note: 'Znüni und gute Schuhe mitnehmen.' },
      { id: 'e8', weekOffset: 1, weekday: 0, type: 'bib', time: '10:00', title: 'Bibliothek', note: 'Buch fertig lesen!' },
      { id: 'e9', weekOffset: 1, weekday: 2, type: 'test', time: '10:00', title: 'Englisch-Test: My Day', note: 'Lernen: Unit 3' },
      { id: 'e10', weekOffset: 1, weekday: 3, type: 'sonst', time: '19:00', title: 'Elternabend', note: 'Sag es deinen Eltern.' },
      { id: 'e11', weekOffset: 1, weekday: 4, type: 'ausflug', time: '14:00', title: 'Theater-Besuch', note: 'Wir treffen uns beim Schulhaus.' },
    ],
    settings: {
      coinsPerSubmission: 150, allowedGames: ['auto', 'bau', 'huepf', 'tor'], maxMinutes: 30,
      hausiTeacherCanRead: true, hausiSchoolTopicsOnly: true,
    },
    teacher: { name: 'Brunner', login: 'Brunner', password: 'Tafel2026' },
    garages: {},
    chats: {},
    buildCity: {},
  };
}
