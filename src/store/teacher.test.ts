import { describe, expect, it } from 'vitest';
import { createSeed } from './seed';
import * as R from './rules';

const draft = {
  subject: 'mathe' as const, title: 'Test', instruction: 'Rechne', dueWeekday: 3 as const, important: false, kind: 'question' as const,
  tasks: [{ kind: 'question' as const, question: '2 × 3', sampleSolution: '6' }],
};

describe('Lehrerin: Hausaufgabe verteilen', () => {
  it('legt Hausaufgabe und für jedes Kind eine offene Abgabe an', () => {
    const d = R.createHomework(createSeed(), draft);
    const hw = d.homeworks[d.homeworks.length - 1];
    const subs = d.submissions.filter((s) => s.homeworkId === hw.id);
    expect(subs).toHaveLength(5);
    expect(subs.every((s) => s.status === 'offen')).toBe(true);
    expect(hw.dueWeekOffset).toBe(0);
  });
  it('Abgabetag vor heute landet in der nächsten Woche', () => {
    const d = R.createHomework(createSeed(), { ...draft, dueWeekday: 0 });
    expect(d.homeworks[d.homeworks.length - 1].dueWeekOffset).toBe(1);
  });
  it('verlangt Titel und Aufgaben', () => {
    expect(() => R.createHomework(createSeed(), { ...draft, title: ' ' })).toThrow('Titel');
    expect(() => R.createHomework(createSeed(), { ...draft, tasks: [] })).toThrow();
  });
});

describe('Lehrerin: Schüler verwalten', () => {
  it('neues Kind startet mit 0 Spielgeld, NEU und bekommt aktuelle Hausaufgaben', () => {
    const d = R.addStudent(createSeed(), 'Mia', 'Regen22');
    const mia = d.students.find((s) => s.name === 'Mia')!;
    expect(mia.coins).toBe(0);
    expect(mia.isNew).toBe(true);
    expect(d.submissions.filter((s) => s.studentId === mia.id)).toHaveLength(5);
  });
  it('ändert Name und Passwort, aber nie Spielgeld', () => {
    const d = R.updateStudent(createSeed(), 'mattia', { name: 'Mattia B.', password: 'Neu123', coins: 0 } as never);
    const m = d.students.find((s) => s.id === 'mattia')!;
    expect(m.name).toBe('Mattia B.');
    expect(m.password).toBe('Neu123');
    expect(m.coins).toBe(900);
  });
  it('verhindert doppelte Namen', () => {
    expect(() => R.addStudent(createSeed(), 'mattia', 'x')).toThrow();
  });
});

describe('Lehrerin: Agenda und Einstellungen', () => {
  it('Termin anlegen und löschen', () => {
    let d = R.addEvent(createSeed(), { weekOffset: 1, weekday: 1, type: 'ausflug', title: 'Zoo', time: '09:00' });
    const ev = d.events[d.events.length - 1];
    expect(ev.title).toBe('Zoo');
    d = R.deleteEvent(d, ev.id);
    expect(d.events.find((e) => e.id === ev.id)).toBeUndefined();
  });
  it('mindestens ein Spiel bleibt erlaubt', () => {
    let d = createSeed();
    d = R.toggleGame(d, 'auto'); d = R.toggleGame(d, 'bau'); d = R.toggleGame(d, 'huepf');
    expect(() => R.toggleGame(d, 'tor')).toThrow();
  });
});
