import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { lockReason, type LockReason } from '../../store/rules';
import { act, errorText } from '../../store/actions';
import { TEACHER_TITLE } from '../../store/constants';
import type { GameId } from '../../store/types';
import { GAMES } from '../../data/subjects';
import { gameAuto, gameBau, gameHuepf, gameTor } from '../../components/designSvgs';
import { Coin, IconCheck, IconLock, IconPlay } from '../../components/icons';
import { useKid } from './useKid';
import './Belohnung.css';

const ART: Record<GameId, string> = { auto: gameAuto, bau: gameBau, huepf: gameHuepf, tor: gameTor };

export function Belohnung() {
  const { subId } = useParams();
  const { data, student } = useKid();
  const nav = useNavigate();
  const sub = data.submissions.find((s) => s.id === subId && s.studentId === student.id);
  // Sperre beim Öffnen festhalten (claimReward setzt skipNextGame danach zurück).
  const [reason] = useState<LockReason>(() => lockReason(student));
  const [alreadyUsed] = useState(() => !!sub?.rewardUsed && reason === 'keine');
  const [picked, setPicked] = useState<GameId | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (sub && reason !== 'keine') act.claimReward(sub.id).catch(() => undefined); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sub) return <Navigate to="/kind" replace />;

  const blocked = reason !== 'keine' || alreadyUsed;
  const minutes = data.settings.maxMinutes;
  const games = data.settings.allowedGames;
  const debt = student.coins < 0 ? `Du hast noch −${Math.abs(student.coins)} Spielgeld Schulden.` : 'Du hast gerade 0 Spielgeld.';
  const texts = {
    gestrichen: ['Heute leider kein Spiel', `${TEACHER_TITLE} hat dein Spiel gestrichen, weil die letzte Hausaufgabe nicht gemacht war. Beim nächsten Mal darfst du wieder spielen.`],
    schulden: ['Spielen ist gesperrt', `${debt} Mach weiter deine Hausaufgaben – ab mehr als 0 Spielgeld darfst du wieder spielen.`],
    used: ['Schon gespielt', 'Für diese Abgabe hast du dein Spiel schon gespielt. Mach die nächste Hausaufgabe – dann gibt es wieder ein Spiel!'],
  };
  const block = reason !== 'keine' ? texts[reason] : alreadyUsed ? texts.used : null;

  const play = async () => {
    if (!picked) return;
    try { await act.startGame(sub.id, picked); nav(`/kind/spiel/${picked}`); }
    catch (e) { setErr(errorText(e)); }
  };

  return (
    <main className="rew">
      <div className="rew-top">
        <div className="rew-check"><IconCheck size={48} /></div>
        <h1>Super, abgegeben!</h1>
        <p>Wähle <b>1 Spiel</b> als Belohnung. Du hast <b>{minutes} Minuten</b> Zeit.</p>
        <div className="rew-coins">
          <Coin size={30} />
          <span className="rew-coins-amount">+{sub.baseReward ?? data.settings.coinsPerSubmission} Spielgeld für diese Abgabe</span>
          <span className="rew-coins-note">· In allen Spielen gibt es nur Spielgeld – kein echtes Geld.</span>
        </div>
      </div>
      {block && (
        <div role="status" className="rew-block">
          <div className="rew-lock"><IconLock size={28} /></div>
          <div>
            <div className="rew-block-title">{block[0]}</div>
            <div className="rew-block-text">{block[1]}</div>
          </div>
        </div>
      )}
      <div className={`rew-grid${blocked ? ' blocked' : ''}`} aria-disabled={blocked}>
        {games.map((g) => {
          const on = picked === g;
          const meta = GAMES[g];
          return (
            <button key={g} type="button" disabled={blocked} aria-pressed={on} onClick={() => setPicked(g)} className="rew-game"
              style={{ borderColor: on ? meta.color : 'transparent' }}>
              <div className="rew-game-art" style={{ background: meta.bg, color: meta.color }} dangerouslySetInnerHTML={{ __html: ART[g] }} />
              <div className="rew-game-name">{meta.name}</div>
              <div className="rew-game-desc">{meta.desc}</div>
            </button>
          );
        })}
      </div>
      <div aria-live="assertive">{err && <div className="msg-error">{err}</div>}</div>
      <div style={{ flexGrow: 1 }} />
      <div className="rew-actions">
        <Link to="/kind" className="rew-later">{blocked ? 'Zur Übersicht' : 'Später spielen'}</Link>
        <button type="button" className="rew-play" disabled={blocked || !picked} onClick={play}>
          {blocked ? <IconLock size={22} /> : <IconPlay />}
          {blocked ? 'Gesperrt' : picked ? `${GAMES[picked].name} spielen` : 'Wähle ein Spiel'}
        </button>
      </div>
    </main>
  );
}
