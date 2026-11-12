import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, CloseButton } from './Dialog';
import { Coin, IconCamera } from './icons';
import { resizeImage } from '../utils/image';
import { errorText } from '../store/actions';

interface Props {
  name: string;
  subtitle: string;
  photo?: string;
  password: string;
  coins?: number;
  onPhoto: (dataUrl: string) => Promise<void>;
  /** Prüft das alte Passwort und speichert das neue (wirft RuleError mit Text). */
  onChangePassword: (oldPw: string, newPw: string) => Promise<void>;
  onLogout: () => void;
  onClose: () => void;
}

/** Konto-Popover (Kind und Lehrerin): Foto, Spielgeld, Passwort, Abmelden. */
export function AccountPopover(p: Props) {
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [busy, setBusy] = useState(false);
  // Leeres Passwort = Klassen-Modus: Passwort ist sicher (gehasht) gespeichert und nicht anzeigbar.
  const hidden = p.password === '';
  const save = async () => {
    if (pw1.length < 6) return setMsg({ ok: false, text: 'Das neue Passwort braucht mindestens 6 Zeichen.' });
    if (pw1 !== pw2) return setMsg({ ok: false, text: 'Die beiden neuen Passwörter sind nicht gleich.' });
    setBusy(true);
    try {
      await p.onChangePassword(oldPw, pw1);
      setForm(false); setOldPw(''); setPw1(''); setPw2('');
      setMsg({ ok: true, text: 'Passwort geändert!' });
    } catch (e) { setMsg({ ok: false, text: errorText(e) }); }
    setBusy(false);
  };

  return (
    <Dialog label="Mein Konto" onClose={p.onClose} className="popover-account">
      <CloseButton onClick={p.onClose} />
      <div className="acc-head">
        <label className="acc-photo" title="Profilbild ändern">
          <input type="file" accept="image/*" aria-label="Profilbild auswählen" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) { try { await p.onPhoto(await resizeImage(f)); } catch (err) { setMsg({ ok: false, text: errorText(err) }); } }
          }} />
          <div className="acc-photo-circle">{p.photo ? <img src={p.photo} alt="Dein Profilbild" /> : p.name[0]}</div>
          <div className="acc-cam" aria-hidden="true"><IconCamera size={15} /></div>
        </label>
        <div>
          <div className="acc-name">{p.name}</div>
          <div className="acc-sub">{p.subtitle}</div>
          <div className="acc-hint">Auf die Kamera tippen zum Ändern</div>
        </div>
      </div>
      {p.coins !== undefined && (
        <div className="acc-coins">
          <Coin size={30} />
          <div style={{ flexGrow: 1 }}>
            <div className="acc-coins-label">MEIN SPIELGELD</div>
            <div className="acc-coins-value">{p.coins}</div>
          </div>
          <Link to="/kind/shop" className="btn-small-brand" onClick={p.onClose}>Zum Shop</Link>
        </div>
      )}
      <div className="acc-pw">
        <div>
          <div className="acc-pw-label">MEIN PASSWORT</div>
          <div className="acc-pw-value">{hidden ? '••••••••' : showPw ? p.password : '••••••••'}</div>
          {hidden && <div className="acc-tip">Sicher gespeichert – niemand kann es lesen.</div>}
        </div>
        {!hidden && <button type="button" className="btn-soft" aria-pressed={showPw} onClick={() => setShowPw(!showPw)}>{showPw ? 'Verbergen' : 'Anzeigen'}</button>}
      </div>
      {!form ? (
        <button type="button" className="btn-soft" onClick={() => { setForm(true); setMsg(null); }}>Passwort ändern</button>
      ) : (
        <div className="acc-pwform">
          <label>Altes Passwort<input type="password" autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} /></label>
          <label>Neues Passwort (mind. 6 Zeichen)<input type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} /></label>
          <label>Neues Passwort nochmal<input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <div aria-live="assertive">{msg && !msg.ok && <div className="msg-error">{msg.text}</div>}</div>
          <div className="row">
            <button type="button" style={{ background: '#F1ECE7', color: 'var(--brand)' }} onClick={() => { setForm(false); setMsg(null); }}>Abbrechen</button>
            <button type="button" style={{ background: 'var(--success)', color: '#FFFFFF' }} disabled={busy} onClick={save}>{busy ? 'Speichert …' : 'Speichern'}</button>
          </div>
        </div>
      )}
      <div aria-live="polite">{msg?.ok && <div className="msg-ok">{msg.text}</div>}{msg && !msg.ok && !form && <div className="msg-error">{msg.text}</div>}</div>
      <div className="acc-tip">Tipp: Zeig dein Passwort niemandem.</div>
      <button type="button" className="btn-outline" onClick={p.onLogout}>Abmelden</button>
    </Dialog>
  );
}
