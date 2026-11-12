import { useState } from 'react';
import { huepfHero, huepfScene } from '../components/designSvgs';
import { GameFrame, Stage } from './GameFrame';
import './games.css';

const PTS: [number, number][] = [[60, 640], [230, 540], [400, 450], [570, 380], [740, 300], [910, 230]];
const Star = () => (
  <svg aria-hidden="true" width="38" height="38" viewBox="0 0 24 24"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3 1.2-6.5L2.5 8.9 9.1 8z" fill="#F2B33D" stroke="#C98A12" strokeWidth="1" /></svg>
);

/** Platzhalter: „Springen!“ bewegt die Figur zur nächsten Plattform und sammelt einen Stern. */
export function HuepfHeld() {
  const [pos, setPos] = useState(0);
  const [stars, setStars] = useState(0);
  const [level, setLevel] = useState(1);
  const done = pos === PTS.length - 1;
  const cur = PTS[pos];
  return (
    <GameFrame game="huepf" label="Hüpf-Held" warnHint="spring noch schnell ins Ziel!" score={<>Level {level} · Sterne: {stars}</>}
      overText={`Du hast ${stars} Sterne gesammelt. Nach der nächsten Hausaufgabe geht es weiter.`}>
      {({ over }) => (
        <>
          <Stage label={`Hüpf-Held auf Plattform ${pos + 1} von ${PTS.length}`}>
            <div dangerouslySetInnerHTML={{ __html: huepfScene }} />
            {PTS.map((p, i) => (
              <div key={i}>
                <div className="hp-platform" style={{ left: p[0], top: p[1], background: i === 0 ? 'transparent' : '#8A5A00', boxShadow: i === 0 ? 'none' : 'inset 0 6px 0 #5FA052' }} />
                {i > 0 && i > pos && <div className="hp-star" style={{ left: p[0] + 46, top: p[1] - 56 }}><Star /></div>}
              </div>
            ))}
            <div className="hp-hero" style={{ left: cur[0] + 35, top: cur[1] - 78 }} dangerouslySetInnerHTML={{ __html: huepfHero }} />
            {done && <div role="status" className="hp-done">Level geschafft!</div>}
          </Stage>
          <div className="gf-controls">
            {!done ? (
              <button type="button" className="hp-jump" disabled={over} onClick={() => { setPos(pos + 1); setStars(stars + 1); }}>Springen!</button>
            ) : (
              <button type="button" className="hp-next" onClick={() => { setPos(0); setLevel(level + 1); }}>Nächstes Level ›</button>
            )}
          </div>
        </>
      )}
    </GameFrame>
  );
}
