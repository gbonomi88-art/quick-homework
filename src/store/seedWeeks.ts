import type { AgendaEvent, Homework } from './types';

/**
 * Beispiel-Hausaufgaben und -Termine für die nächsten vier Wochen (Woche +1 bis +4).
 * Gilt für die Demo; dieselben Inhalte stehen in supabase/schema.sql (qh.seed_weeks) für den Klassen-Modus.
 */
type H = Omit<Homework, 'createdBy'>;
export const WEEK_HOMEWORKS: H[] = [
  // Woche +1
  {
    id: 'hw-w1-zahlen', subject: 'mathe', title: 'Grosse Zahlen vergleichen', dueWeekday: 1, dueWeekOffset: 1, important: false, kind: 'compare',
    instruction: 'Setze das richtige Zeichen ein: < (kleiner), > (grösser) oder = (gleich).',
    hausiTip: 'Schreib beide Zahlen in der gleichen Einheit untereinander und vergleiche Stelle für Stelle.',
    tasks: [
      { kind: 'compare', left: '45 000', right: '45 100', solution: '<' },
      { kind: 'compare', left: '1 000 000', right: '999 999', solution: '>' },
      { kind: 'compare', left: '3,5 km', right: '3500 m', solution: '=' },
      { kind: 'compare', left: '0,75', right: '3/4', solution: '=' },
    ],
  },
  {
    id: 'hw-w1-mehrzahl', subject: 'deutsch', title: 'Nomen in der Mehrzahl', dueWeekday: 2, dueWeekOffset: 1, important: false, kind: 'question',
    instruction: 'Schreib das Nomen in der Mehrzahl – mit Artikel.',
    tasks: [
      { kind: 'question', question: 'das Kind', placeholder: 'die …', sampleSolution: 'die Kinder' },
      { kind: 'question', question: 'der Baum', placeholder: 'die …', sampleSolution: 'die Bäume' },
      { kind: 'question', question: 'die Maus', placeholder: 'die …', sampleSolution: 'die Mäuse' },
      { kind: 'question', question: 'das Buch', placeholder: 'die …', sampleSolution: 'die Bücher' },
    ],
  },
  {
    id: 'hw-w1-weather', subject: 'englisch', title: 'The Weather', dueWeekday: 3, dueWeekOffset: 1, important: false, kind: 'question',
    instruction: 'Wie heisst das Wetter auf Englisch?',
    tasks: [
      { kind: 'question', question: 'der Regen', sampleSolution: 'the rain' },
      { kind: 'question', question: 'der Schnee', sampleSolution: 'the snow' },
      { kind: 'question', question: 'die Sonne', sampleSolution: 'the sun' },
      { kind: 'question', question: 'Wie sagst du «Es ist kalt»?', sampleSolution: 'It is cold.' },
    ],
  },
  // Woche +2
  {
    id: 'hw-w2-wald', subject: 'nmg', title: 'Der Wald im Winter', dueWeekday: 1, dueWeekOffset: 2, important: true, kind: 'question',
    instruction: 'Beantworte die Fragen in ganzen Sätzen.',
    hausiTip: 'Überleg dir, was Tiere und Bäume tun, wenn es kalt wird und wenig Futter gibt.',
    tasks: [
      { kind: 'question', question: 'Nenne zwei Tiere, die Winterschlaf halten.' },
      { kind: 'question', question: 'Warum verlieren Laubbäume im Herbst ihre Blätter?' },
      { kind: 'question', question: 'Was fressen Rehe im Winter?' },
      { kind: 'question', question: 'Nenne einen Nadelbaum.', sampleSolution: 'Tanne oder Fichte' },
    ],
  },
  {
    id: 'hw-w2-geteilt', subject: 'mathe', title: 'Geteilt-Rechnungen', dueWeekday: 2, dueWeekOffset: 2, important: false, kind: 'question',
    instruction: 'Rechne aus.',
    tasks: [
      { kind: 'question', question: '56 : 7', sampleSolution: '8' },
      { kind: 'question', question: '81 : 9', sampleSolution: '9' },
      { kind: 'question', question: '144 : 12', sampleSolution: '12' },
      { kind: 'question', question: '63 : 9', sampleSolution: '7' },
    ],
  },
  {
    id: 'hw-w2-couleurs', subject: 'franz', title: 'Vokabeln: Les couleurs', dueWeekday: 3, dueWeekOffset: 2, important: false, kind: 'question',
    instruction: 'Übersetze die Farben ins Deutsche.',
    tasks: [
      { kind: 'question', question: 'rouge', sampleSolution: 'rot' },
      { kind: 'question', question: 'bleu', sampleSolution: 'blau' },
      { kind: 'question', question: 'vert', sampleSolution: 'grün' },
      { kind: 'question', question: 'jaune', sampleSolution: 'gelb' },
    ],
  },
  // Woche +3
  {
    id: 'hw-w3-subjekt', subject: 'deutsch', title: 'Das Subjekt finden', dueWeekday: 1, dueWeekOffset: 3, important: false, kind: 'question',
    instruction: 'Schreib das Subjekt des Satzes auf. Frag: Wer oder was …?',
    hausiTip: 'Frag «Wer oder was bellt?» – die Antwort ist das Subjekt.',
    tasks: [
      { kind: 'question', question: 'Der Hund bellt laut.', sampleSolution: 'Der Hund' },
      { kind: 'question', question: 'Am Morgen fährt Lina mit dem Velo.', sampleSolution: 'Lina' },
      { kind: 'question', question: 'Die Kerzen leuchten hell.', sampleSolution: 'Die Kerzen' },
      { kind: 'question', question: 'Im Winter schläft der Igel.', sampleSolution: 'der Igel' },
    ],
  },
  {
    id: 'hw-w3-past', subject: 'englisch', title: 'Simple Past', dueWeekday: 2, dueWeekOffset: 3, important: false, kind: 'question',
    instruction: 'Write the verb in the simple past.',
    tasks: [
      { kind: 'question', question: 'I play', placeholder: 'I …', sampleSolution: 'I played' },
      { kind: 'question', question: 'she walks', placeholder: 'she …', sampleSolution: 'she walked' },
      { kind: 'question', question: 'we go', placeholder: 'we …', sampleSolution: 'we went' },
      { kind: 'question', question: 'they eat', placeholder: 'they …', sampleSolution: 'they ate' },
    ],
  },
  {
    id: 'hw-w3-masse', subject: 'mathe', title: 'Masse und Zeit vergleichen', dueWeekday: 3, dueWeekOffset: 3, important: false, kind: 'compare',
    instruction: 'Setze das richtige Zeichen ein: < (kleiner), > (grösser) oder = (gleich).',
    hausiTip: 'Rechne zuerst in die kleinere Einheit um: 1 kg = 1000 g, 1 l = 1000 ml, 1 h = 60 min.',
    tasks: [
      { kind: 'compare', left: '3 kg', right: '3000 g', solution: '=' },
      { kind: 'compare', left: '250 g', right: '0,5 kg', solution: '<' },
      { kind: 'compare', left: '2 l', right: '1500 ml', solution: '>' },
      { kind: 'compare', left: '1 h', right: '50 min', solution: '>' },
    ],
  },
  // Woche +4
  {
    id: 'hw-w4-schweiz', subject: 'nmg', title: 'Die Schweiz', dueWeekday: 1, dueWeekOffset: 4, important: false, kind: 'question',
    instruction: 'Beantworte die Fragen. Du darfst die Schweizer Karte benutzen.',
    tasks: [
      { kind: 'question', question: 'Wie heisst die Bundesstadt der Schweiz?', sampleSolution: 'Bern' },
      { kind: 'question', question: 'Wie viele Kantone hat die Schweiz?', sampleSolution: '26' },
      { kind: 'question', question: 'Welcher Fluss fliesst durch Basel?', sampleSolution: 'der Rhein' },
      { kind: 'question', question: 'Nenne die vier Landessprachen.', sampleSolution: 'Deutsch, Französisch, Italienisch, Rätoromanisch' },
    ],
  },
  {
    id: 'hw-w4-etre', subject: 'franz', title: 'Le verbe «être»', dueWeekday: 2, dueWeekOffset: 4, important: false, kind: 'question',
    instruction: 'Schreib die richtige Form von «être» auf.',
    tasks: [
      { kind: 'question', question: 'je … (être)', placeholder: 'je …', sampleSolution: 'je suis' },
      { kind: 'question', question: 'tu … (être)', placeholder: 'tu …', sampleSolution: 'tu es' },
      { kind: 'question', question: 'il … (être)', placeholder: 'il …', sampleSolution: 'il est' },
      { kind: 'question', question: 'nous … (être)', placeholder: 'nous …', sampleSolution: 'nous sommes' },
    ],
  },
  {
    id: 'hw-w4-advent', subject: 'mathe', title: 'Advents-Rechnungen', dueWeekday: 3, dueWeekOffset: 4, important: true, kind: 'question',
    instruction: 'Löse die Textaufgaben. Schreib die Antwort mit Einheit.',
    hausiTip: 'Lies die Aufgabe zweimal und überlege: Muss ich plus, minus, mal oder geteilt rechnen?',
    tasks: [
      { kind: 'question', question: 'Ein Adventskalender hat 24 Türchen. 9 sind schon offen. Wie viele sind noch zu?', sampleSolution: '15' },
      { kind: 'question', question: 'Lina backt 4 Bleche mit je 12 Guetzli. Wie viele Guetzli sind es?', sampleSolution: '48' },
      { kind: 'question', question: 'Ein Christbaum kostet 45 Fr., die Kugeln 18 Fr. Wie viel kostet alles zusammen?', sampleSolution: '63 Fr.' },
      { kind: 'question', question: '36 Kerzen werden auf 4 Kinder verteilt. Wie viele bekommt jedes Kind?', sampleSolution: '9' },
    ],
  },
];

export const WEEK_EVENTS: AgendaEvent[] = [
  // Woche +2
  { id: 'e-w2-bib', weekOffset: 2, weekday: 0, type: 'bib', time: '10:00', title: 'Bibliothek', note: 'Ausgeliehene Bücher mitbringen.' },
  { id: 'e-w2-test', weekOffset: 2, weekday: 3, type: 'test', time: '08:15', title: 'Mathe-Test: Grosse Zahlen', note: 'Lernen: Seite 40–43' },
  { id: 'e-w2-chlaus', weekOffset: 2, weekday: 4, type: 'sonst', time: '10:00', title: 'Samichlaus besucht die Klasse', note: 'Ein Värsli oder Lied vorbereiten.' },
  // Woche +3
  { id: 'e-w3-bib', weekOffset: 3, weekday: 0, type: 'bib', time: '10:00', title: 'Bibliothek', note: 'Neues Buch ausleihen.' },
  { id: 'e-w3-test', weekOffset: 3, weekday: 1, type: 'test', time: '13:30', title: 'Französisch: Vokabeltest', note: 'Les couleurs' },
  { id: 'e-w3-museum', weekOffset: 3, weekday: 2, type: 'ausflug', time: '09:00', title: 'Besuch im Naturmuseum', note: 'Znüni und Trinkflasche mitnehmen.' },
  { id: 'e-w3-eis', weekOffset: 3, weekday: 4, type: 'sonst', time: '08:00', title: 'Schlittschuhlaufen', note: 'Handschuhe und Mütze mitnehmen.' },
  // Woche +4
  { id: 'e-w4-bib', weekOffset: 4, weekday: 0, type: 'bib', time: '10:00', title: 'Bibliothek', note: 'Letzte Ausleihe vor den Ferien.' },
  { id: 'e-w4-test', weekOffset: 4, weekday: 2, type: 'test', time: '10:00', title: 'Englisch-Test: Simple Past', note: 'Lernen: Unit 4' },
  { id: 'e-w4-singen', weekOffset: 4, weekday: 3, type: 'sonst', time: '18:00', title: 'Weihnachtssingen', note: 'Eltern sind herzlich eingeladen.' },
  { id: 'e-w4-ferien', weekOffset: 4, weekday: 4, type: 'sonst', time: '11:45', title: 'Letzter Schultag – Ferienbeginn', note: 'Schöne Weihnachtsferien!' },
];
