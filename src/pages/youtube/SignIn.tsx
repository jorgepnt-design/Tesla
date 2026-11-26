/** Anmeldung per Handy: QR-Code für google.com/device und der einzugebende Code */
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, Smartphone, X } from 'lucide-react';
import { pollDeviceFlow, startDeviceFlow, type DeviceCode } from '../../lib/youtube/auth';
import { clearCache } from '../../lib/youtube/api';

export function SignInDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState<DeviceCode | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // onClose kann sich bei jedem Rendern ändern – darf den Anmeldeablauf nicht neu starten
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setCode(null);
    setError(null);

    const poll = (c: DeviceCode) => {
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (Date.now() > c.expiresAt) return setError('Der Code ist abgelaufen.');
        try {
          const token = await pollDeviceFlow(c);
          if (cancelled) return;
          if (token) {
            clearCache();
            closeRef.current();
          } else poll(c);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        }
      }, c.interval * 1000);
    };

    startDeviceFlow()
      .then(async (c) => {
        if (cancelled) return;
        setCode(c);
        setQr(await QRCode.toDataURL(c.verificationUrl, { margin: 1, width: 360, color: { dark: '#000000', light: '#ffffff' } }));
        poll(c);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8" onClick={onClose}>
      <div className="fade-in relative w-full max-w-4xl rounded-3xl bg-panel p-10 ring-1 ring-line" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Schließen" className="absolute right-5 top-5 rounded-full p-3 text-white/60 hover:bg-white/10">
          <X className="h-7 w-7" />
        </button>
        <h2 className="text-3xl font-bold">Mit dem Handy anmelden</h2>
        <p className="mt-2 text-lg text-white/55">Dein Google-Passwort tippst du nur am Handy ein – nie im Auto.</p>

        {error ? (
          <div className="mt-8 space-y-5">
            <p className="rounded-2xl bg-red-500/10 p-5 text-lg text-red-200">{error}</p>
            <button onClick={() => setAttempt((a) => a + 1)} className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black">
              Neuen Code holen
            </button>
          </div>
        ) : !code ? (
          <div className="mt-10 flex items-center gap-3 text-xl text-white/60">
            <Loader2 className="h-7 w-7 animate-spin" /> Code wird angefordert …
          </div>
        ) : (
          <div className="mt-8 flex items-center gap-10">
            {qr && <img src={qr} alt="QR-Code zu google.com/device" className="h-60 w-60 rounded-2xl bg-white p-2" />}
            <ol className="flex-1 space-y-5 text-xl">
              <li className="flex gap-4">
                <Step n={1} />
                <span>
                  QR-Code mit dem Handy scannen oder <b className="text-accent">{code.verificationUrl.replace(/^https?:\/\//, '')}</b> öffnen.
                </span>
              </li>
              <li className="flex gap-4">
                <Step n={2} />
                <span>
                  Diesen Code eingeben:
                  <span className="mt-2 block font-mono text-5xl font-bold tracking-widest text-white">{code.userCode}</span>
                </span>
              </li>
              <li className="flex gap-4">
                <Step n={3} />
                <span>Google-Konto wählen und „Zulassen“ tippen. Dieser Bildschirm geht dann von selbst weiter.</span>
              </li>
              <li className="flex items-center gap-3 text-base text-white/45">
                <Smartphone className="h-5 w-5" /> Warte auf Bestätigung …
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">{n}</span>;
}
