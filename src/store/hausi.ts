/**
 * Hausi – Lern-Helfer ohne echte KI. Wichtigste Regel: Tipps, nie Lösungen.
 * Alle Antworten werden aus Regeln pro Aufgabentyp gebaut.
 */
import type { Homework, Task } from './types';

export type HausiIntent = 'tipp' | 'erklaeren' | 'frei';

const frac = (s: string) => s.includes('/') ? s.split('/') : null;
const STRONG_HINT = 'Ist es ein starkes Verb? Dann ändert sich der Selbstlaut.';

export function greeting(hw: Homework, lang?: string) {
  const hi = lang === 'fr-FR' ? 'Bonjour!' : lang === 'en-GB' ? 'Hello!' : 'Hallo!';
  return `${hi} Wie kann ich helfen? Sag mir, woran du gerade arbeitest.`;
}

/** Tipp für eine bestimmte Aufgabe (0-basiert). */
export function taskTip(hw: Homework, i: number): string {
  const t: Task = hw.tasks[i];
  const n = `Aufgabe ${i + 1}: `;
  if (t.kind === 'compare') {
    const f = frac(t.left) ?? frac(t.right);
    if (f) return `${n}Mach aus ${f[0]}/${f[1]} eine Dezimalzahl. Rechne ${f[0]} : ${f[1]}. Was kommt heraus?`;
    return `${n}Schreib beide Zahlen untereinander und vergleiche Stelle für Stelle.`;
  }
  if (t.kind === 'transform') return `${n}«${t.word}» – ${STRONG_HINT} Sonst hängst du -te an.`;
  if (hw.subject === 'franz') return `${n}Denk an das Tier «${t.question}». Wie sieht es aus? Und heisst es der, die oder das?`;
  if (hw.subject === 'englisch') {
    const start = t.placeholder?.replace(/\s*…$/, '');
    return `${n}Schau dir die Frage genau an. Einige Wörter aus der Frage kannst du brauchen.${start ? ` Fang so an: «${start} …»` : ''}`;
  }
  if (/^\d+\s*×\s*\d+$/.test(t.question)) {
    const [a, b] = t.question.split('×').map((x) => Number(x.trim()));
    const [s, l] = a <= b ? [a, b] : [b, a];
    if (l > 10) return `${n}Zerlege die Rechnung: ${s} × ${l} ist das Gleiche wie ${s} × 10 plus ${s} × ${l - 10}.`;
    return `${n}Zähle in ${l}er-Schritten: ${l}, ${2 * l}, ${3 * l} … Wie viele Schritte brauchst du? Genau ${s}!`;
  }
  return `${n}Lies die Frage nochmal. Welche Wörter aus der Frage kannst du in deiner Antwort brauchen?`;
}

export function explain(hw: Homework): string {
  switch (hw.kind) {
    case 'compare': return 'Du vergleichst zwei Zahlen. Ist die linke grösser, kommt > hin. Ist sie kleiner, kommt < hin. Sind beide gleich gross, kommt = hin. Tipp: Die Spitze zeigt immer zur kleineren Zahl.';
    case 'transform': return 'Du schreibst, was jemand früher gemacht hat – in der Vergangenheit. Beispiel: «ich lache» wird zu «ich lachte». Bei starken Verben ändert sich der Selbstlaut, z. B. «ich trinke» → «ich trank».';
    default:
      if (hw.subject === 'franz') return 'Du übersetzt das französische Wort ins Deutsche. Schreib den Artikel dazu: der, die oder das.';
      if (hw.subject === 'englisch') return 'Answer in English! Beantworte die Frage über deinen Tag und beginne mit «I …».';
      return 'Lies jede Frage langsam durch. Antworte in einem ganzen Satz und nimm Wörter aus der Frage dazu.';
  }
}

const SCHOOL = /aufgabe|tipp|hilf|hilfe|wie|was|warum|wieso|weshalb|versteh|frage|antwort|lösung|loes|rechn|bruch|zahl|verb|wort|heisst|übersetz|schreib|weiss|nummer|\d|\?/i;

/** Antwort auf eine Nachricht. `focus` = Aufgabe, an der das Kind gerade ist. */
export function reply(hw: Homework, intent: HausiIntent, focus: number, text = '', schoolTopicsOnly = true, tipRound = 0): string {
  if (intent === 'erklaeren') return explain(hw);
  if (intent === 'frei') {
    const m = text.match(/(?:aufgabe|nummer|nr\.?)\s*(\d)/i);
    const idx = m ? Math.min(hw.tasks.length - 1, Math.max(0, Number(m[1]) - 1)) : focus;
    if (/lösung|loesung|sag mir|verrat|antwort.*sagen|was ist die antwort/i.test(text)) {
      return `Die Lösung verrate ich nicht – du schaffst das selbst! ${taskTip(hw, idx)}`;
    }
    if (!SCHOOL.test(text) && schoolTopicsOnly) return 'Ich helfe dir gerne bei deiner Hausaufgabe. Frag mich etwas dazu!';
    return taskTip(hw, idx);
  }
  // Abwechselnd: Tipp der Lehrerin, dann Aufgaben-Tipp.
  if (hw.hausiTip && tipRound % 2 === 0) return `Tipp: ${hw.hausiTip}`;
  return taskTip(hw, focus);
}
