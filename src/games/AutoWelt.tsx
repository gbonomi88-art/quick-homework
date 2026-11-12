import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { autoScene } from '../components/designSvgs';
import { Coin } from '../components/icons';
import { GameFrame, Stage } from './GameFrame';

/** Platzhalter: Stadt-Szene mit Auto. Frei herumfahren kommt später. */
export function AutoWelt() {
  const coins = useStore((s) => s.data.students.find((x) => s.session?.role === 'kid' && x.id === s.session.studentId)?.coins ?? 0);
  return (
    <GameFrame game="auto" label="Auto-Welt" warnHint="such dir schon mal einen Parkplatz!"
      overText="Gut gespielt. Dein Auto und dein Spielgeld sind gespeichert. Nach der nächsten Hausaufgabe darfst du wieder spielen."
      score={<><Coin size={26} /> {coins} Spielgeld</>}
      extra={
        <Link to="/kind/shop" className="gf-pill accent">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6v10H3z" /><path d="M7 20v-6h10v6" /></svg>
          Garage &amp; Shop
        </Link>
      }>
      {() => (
        <Stage label="Auto-Welt: ein rotes Sportauto fährt nachts durch die Stadt">
          <div dangerouslySetInnerHTML={{ __html: autoScene }} />
          <div className="auto-soon">Frei herumfahren kommt bald!</div>
        </Stage>
      )}
    </GameFrame>
  );
}
