/** Auto-Seite „Vom iPhone senden“: QR-Code zum Koppeln des Handys als Fernbedienung */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { getCarPairing, pairingLink, resetCarPairing, type Pairing } from '../lib/remote';
import { PageTitle } from '../components/ui';

export function CastPage() {
  const [pairing, setPairing] = useState<Pairing>(getCarPairing);
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(pairingLink(pairing), { margin: 1, width: 420, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [pairing]);

  return (
    <div className="max-w-4xl">
      <PageTitle title="Vom iPhone senden" subtitle="Dein Handy wird zur Fernbedienung – Sender und Videos laufen hier im Auto" />

      <div className="flex flex-col items-center gap-8 rounded-3xl bg-panel p-6 ring-1 ring-line sm:flex-row sm:items-start sm:p-8">
        {qr ? (
          <img src={qr} alt="QR-Code zum Koppeln" className="h-64 w-64 shrink-0 rounded-2xl bg-white p-2" />
        ) : (
          <div className="h-64 w-64 shrink-0 rounded-2xl bg-white/5" />
        )}
        <ol className="flex-1 list-decimal space-y-4 pl-6 text-lg marker:font-semibold marker:text-accent sm:text-xl">
          <li>QR-Code mit der iPhone-Kamera scannen und den Link öffnen.</li>
          <li>
            Auf dem iPhone erscheint oben die blaue Leiste <b>„Fernbedienung fürs Auto“</b>.
          </li>
          <li>
            Auf dem iPhone einen Sender, ein YouTube-Video oder über <b>Link</b> einen YouTube-Link wählen – es startet hier im
            Auto.
          </li>
          <li>
            Mit <b>▲ ▼</b> wechselst du den Sender, mit <b>■</b> stoppst du die Wiedergabe.
          </li>
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setPairing(resetCarPairing())}
          className="flex items-center gap-2 rounded-full bg-panel-2 px-5 py-3 text-lg font-semibold ring-1 ring-line"
        >
          <RefreshCw className="h-5 w-5" /> Neu koppeln
        </button>
        <p className="text-base text-white/50">Trennt alle bisher gekoppelten Handys.</p>
      </div>

      <p className="mt-6 flex gap-3 text-base text-white/45">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        Die Verbindung läuft Ende-zu-Ende verschlüsselt über den Dienst ntfy.sh – der Schlüssel steckt nur im QR-Code. Auf
        dem iPhone müssen deine IPTV-Quelle und YouTube eingerichtet sein; das Auto spielt dann ab, was du sendest. Videos
        laufen im Auto wie üblich nur im Stand.
      </p>
    </div>
  );
}
