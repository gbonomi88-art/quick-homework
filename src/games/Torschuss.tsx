import { useState } from 'react';
import { torBall, torKeeper, torScene } from '../components/designSvgs';
import { GameFrame, Stage } from './GameFrame';
import './games.css';

const KX = [330, 495, 660];
const BX = [340, 518, 696];

/** Platzhalter: Links / Mitte / Rechts schiessen, der Torhüter springt zufällig. */
export function Torschuss() {
  const [keeper, setKeeper] = useState(1);
  const [ball, setBall] = useState(-1);
  const [goals, setGoals] = useState(0);
  const [shots, setShots] = useState(0);
  const [goal, setGoal] = useState<boolean | null>(null);
  const shoot = (dir: number) => {
    const k = Math.floor(Math.random() * 3);
    const g = k !== dir;
    setKeeper(k); setBall(dir); setShots(shots + 1); setGoals(goals + (g ? 1 : 0)); setGoal(g);
  };
  const ballPos = ball === -1 ? { left: 518, top: 470 } : { left: BX[ball], top: goal ? 200 : 250 };
  return (
    <GameFrame game="tor" label="Torschuss" warnHint="noch ein paar Schüsse!" score={<>Tore: {goals} / {shots}</>}
      overText={`Du hast ${goals} Tore geschossen. Nach der nächsten Hausaufgabe darfst du wieder spielen.`}>
      {({ over }) => (
        <>
          <Stage label="Fussballfeld mit Tor und Torhüter">
            <div dangerouslySetInnerHTML={{ __html: torScene }} />
            <div className="tor-keeper" style={{ left: KX[keeper] }} dangerouslySetInnerHTML={{ __html: torKeeper }} />
            <div className="tor-ball" style={ballPos} dangerouslySetInnerHTML={{ __html: torBall }} />
          </Stage>
          <div aria-live="assertive" className="tor-msg-wrap">
            {goal !== null && <div className="gf-msg" style={{ background: goal ? '#2F7D4F' : '#C8372D' }}>{goal ? 'Toooor!' : 'Gehalten!'}</div>}
          </div>
          <div className="gf-controls">
            <div className="tor-hint">Wohin schiesst du?</div>
            <div className="gf-controls-row">
              {['‹ Links', 'Mitte', 'Rechts ›'].map((l, i) => (
                <button key={l} type="button" className="tor-shoot" disabled={over} onClick={() => shoot(i)}>{l}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </GameFrame>
  );
}
