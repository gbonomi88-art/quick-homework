import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './pwa.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()); });
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
// iPadOS meldet sich als „Macintosh“, hat aber Touch.
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

/** Knopf „App installieren“ (Chrome/Edge/Android) bzw. Hinweis für iPad/iPhone. */
export function InstallButton() {
  const [, force] = useState(0);
  const [iosHelp, setIosHelp] = useState(false);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  if (isStandalone()) return null;
  if (deferred) {
    return (
      <button type="button" className="install-btn" onClick={async () => {
        const d = deferred; if (!d) return;
        await d.prompt(); await d.userChoice; deferred = null; force((x) => x + 1);
      }}>
        <DownloadIcon /> App installieren
      </button>
    );
  }
  if (isIOS()) {
    return (
      <div className="install-ios">
        <button type="button" className="install-btn" aria-expanded={iosHelp} onClick={() => setIosHelp(!iosHelp)}>
          <DownloadIcon /> Als App installieren
        </button>
        {iosHelp && (
          <p role="status" className="install-hint">
            Tippe in Safari auf <b>Teilen</b> <ShareIcon /> und dann auf <b>«Zum Home-Bildschirm»</b>.
          </p>
        )}
      </div>
    );
  }
  return null;
}

/** Hinweis bei neuer Version. */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-toast" role="status">
      <span>Neue Version verfügbar</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>Neu laden</button>
      <button type="button" aria-label="Später" className="update-close" onClick={() => setNeedRefresh(false)}>✕</button>
    </div>
  );
}

const DownloadIcon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" />
  </svg>
);
const ShareIcon = () => (
  <svg role="img" aria-label="(Symbol: Quadrat mit Pfeil nach oben)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px' }}>
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5v10h14V11h-1" />
  </svg>
);
