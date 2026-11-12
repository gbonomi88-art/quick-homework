import { useState } from 'react';
import { useStore } from '../store/useStore';
import { bauHouse, bauTower, bauTree } from '../components/designSvgs';
import { GameFrame } from './GameFrame';
import './games.css';

type Tool = 'house' | 'tree' | 'tower' | 'road' | '';
const TOOLS: [Tool, string, string][] = [['house', 'Haus', '#C8372D'], ['tree', 'Baum', '#1E5E37'], ['tower', 'Hochhaus', '#9FB3D9'], ['road', 'Strasse', '#5A5A5A'], ['', 'Wegräumen', '#7DBE6E']];
const NAMES: Record<string, string> = { house: 'Haus', tree: 'Baum', tower: 'Hochhaus', road: 'Strasse', '': 'leer' };
const BG: Record<string, string> = { house: '#FCE9BE', tree: '#9ED08F', tower: '#DDE7F7', road: '#5A5A5A', '': '#8CC97E' };
const ART: Record<string, string> = { house: bauHouse, tree: bauTree, tower: bauTower };

export function startCity(): string[] {
  const g = Array(60).fill('');
  [22, 23, 24, 25, 26, 27, 28, 29].forEach((i) => { g[i] = 'road'; });
  g[12] = 'house'; g[14] = 'tree'; g[35] = 'tower';
  return g;
}

/** Platzhalter: 10×6-Raster, Werkzeug wählen und Feld antippen. Die Stadt wird gespeichert. */
export function Baumeister() {
  const [tool, setTool] = useState<Tool>('house');
  const apply = useStore((s) => s.apply);
  const city = useStore((s) => (s.session?.role === 'kid' ? s.data.buildCity[s.session.studentId] : undefined)) ?? startCity();
  const count = city.filter((v) => v && v !== 'road').length;
  return (
    <GameFrame game="bau" label="Baumeister" light warnHint="Zeit für dein letztes Haus!" score={<>Meine Stadt: {count} Teile</>}
      overText="Super gebaut! Deine Stadt ist gespeichert. Nach der nächsten Hausaufgabe kannst du weiterbauen.">
      {({ over, studentId }) => (
        <div className="bau">
          <div className="bau-tools" role="group" aria-label="Werkzeug">
            <div className="bau-tools-title">Werkzeug</div>
            {TOOLS.map(([id, label, c]) => (
              <button key={label} type="button" aria-pressed={tool === id} onClick={() => setTool(id)}>
                <span aria-hidden="true" style={{ background: c }} />{label}
              </button>
            ))}
          </div>
          <div className="bau-grid">
            {city.map((v, i) => (
              <button key={i} type="button" aria-label={`Feld ${i + 1}: ${NAMES[v]}`} style={{ background: BG[v] }}
                onClick={() => {
                  if (over) return;
                  const g = city.slice(); g[i] = tool;
                  apply((d) => ({ ...d, buildCity: { ...d.buildCity, [studentId]: g } }));
                }}
                dangerouslySetInnerHTML={ART[v] ? { __html: ART[v] } : undefined} />
            ))}
          </div>
        </div>
      )}
    </GameFrame>
  );
}
