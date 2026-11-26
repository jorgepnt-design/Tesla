/** Anleitung: Weiterleitung auf dem PC, IPTV einrichten, Fernsehen, Fehlersuche, Nutzung im Auto */
import { useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { PageTitle } from '../components/ui';
import { navigate } from '../lib/router';
import { proxyBase } from '../lib/proxy';

const ZIP_URL = 'https://github.com/jorgepnt-design/Tesla/archive/refs/heads/main.zip';
const APP_URL = 'https://jorgepnt-design.github.io/Tesla/';
const SERVER = 'http://ip.sltv.be:8080';

export function HelpPage() {
  return (
    <div className="max-w-3xl">
      <PageTitle title="Anleitung" subtitle="CarTV mit deinem IPTV einrichten und nutzen" />

      <Section letter="A" title="Einmalig auf dem PC: Weiterleitung starten">
        <p className="text-white/60">
          Dein IPTV-Anbieter ist nur über http:// erreichbar. Die Weiterleitung auf deinem PC reicht die Sender
          verschlüsselt an CarTV weiter.
        </p>
        <Steps>
          <li>Alle schwarzen Fenster der Weiterleitung schließen.</li>
          <li>
            Neue Version herunterladen: <Link href={ZIP_URL}>Tesla-main.zip</Link>
          </li>
          <li>
            Entpacken und den alten Ordner <Code>Dokumente\CarTV\Tesla-main</Code> damit ersetzen.
          </li>
          <li>
            Im Ordner <Code>Tesla-main\relay</Code> doppelt auf <b>start-weiterleitung.bat</b> klicken.
          </li>
          <li>
            Im Fenster steht oben <Code>{proxyBase()}</Code> und unten <b>„CarTV-Weiterleitung läuft …“</b>.{' '}
            <b>Fenster offen lassen.</b>
          </li>
        </Steps>
        <Tip>Ab jetzt reicht jedes Mal nur der Doppelklick auf start-weiterleitung.bat.</Tip>
      </Section>

      <Section letter="B" title="In der App: IPTV einrichten">
        <Steps>
          <li>
            Die App neu laden (am PC <b>Strg + Umschalt + R</b>, im Tesla die Seite neu laden).
          </li>
          <li>
            Auf <b>„Mein IPTV“</b> tippen.
          </li>
          <li>
            <b>„Xtream-Login“</b> wählen und ausfüllen:
            <ul className="mt-2 space-y-2">
              <li>
                Name: z. B. <Code>SLTV</Code>
              </li>
              <li>
                Server: <CopyValue value={SERVER} />
              </li>
              <li>Benutzername und Passwort von deinem Anbieter</li>
            </ul>
          </li>
          <li>
            <b>„Hinzufügen“</b> – die Senderliste erscheint.
          </li>
        </Steps>
        <button
          onClick={() => navigate('/iptv')}
          className="mt-2 rounded-full bg-white px-6 py-3 text-lg font-semibold text-black active:scale-95"
        >
          Zu „Mein IPTV“
        </button>
      </Section>

      <Section letter="C" title="Fernsehen">
        <Steps>
          <li>Sender über das Suchfeld oben finden (z. B. „CMTV“) oder eine Gruppe wählen (z. B. „PT“).</li>
          <li>Sender antippen – der Player öffnet sich im Vollbild.</li>
          <li>
            Im Player: <b>Pfeile links</b> wechseln den Sender, <b>♥</b> speichert als Favorit, <b>Lautsprecher</b>{' '}
            schaltet den Ton, <b>Liste</b> zeigt alle Sender, <b>Pfeil oben links</b> geht zurück.
          </li>
        </Steps>
      </Section>

      <Section letter="D" title="Wenn ein Sender nicht startet">
        <Steps>
          <li>
            <b>„Nochmal“</b> tippen oder einen anderen Sender probieren.
          </li>
          <li>
            Prüfen, ob die Weiterleitung läuft: <Link href={proxyBase()}>{proxyBase().replace(/^https:\/\//, '')}</Link>{' '}
            muss „CarTV-Weiterleitung läuft.“ zeigen.
          </li>
          <li>
            Screenshots an Claude schicken: die Fehlermeldung im Player (mit der Zeile <b>„Technisch: …“</b>) und das
            schwarze Weiterleitungs-Fenster – dort steht für jeden Abruf eine Zeile wie <Code>200 video/mp2t …</Code>{' '}
            oder <Code>403 …</Code> (ohne Zugangsdaten).
          </li>
        </Steps>
      </Section>

      <Section letter="E" title="Vom iPhone senden (Fernbedienung)">
        <Steps>
          <li>
            Im Tesla links auf <b>„Handy“</b> tippen – ein QR-Code erscheint.
          </li>
          <li>QR-Code mit der iPhone-Kamera scannen und den Link öffnen.</li>
          <li>
            Auf dem iPhone erscheint oben die blaue Leiste <b>„Fernbedienung fürs Auto“</b>. Jetzt läuft alles, was du auf
            dem iPhone antippst, im Tesla: Gratis-TV, dein IPTV und YouTube.
          </li>
          <li>
            In der Leiste: <b>▲ ▼</b> Sender wechseln, <b>Link</b> einen YouTube-Link senden, <b>■</b> stoppen, <b>✕</b>{' '}
            Fernbedienung beenden (dann spielt das iPhone wieder selbst ab).
          </li>
        </Steps>
        <Tip>
          Auf dem iPhone müssen IPTV-Anbieter und YouTube eingerichtet sein. Die CarTV-Seite im Tesla muss geöffnet sein.
        </Tip>
      </Section>

      <Section letter="F" title="Im Tesla">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Die App im Tesla-Browser öffnen und als <b>Favorit</b> speichern: <CopyValue value={APP_URL} />
          </li>
          <li>
            Den Anbieter im Tesla-Browser <b>noch einmal hinzufügen</b> (Teil B) – jeder Browser speichert seine
            eigenen Daten.
          </li>
          <li>
            Der <b>PC zu Hause muss an sein</b> und das Weiterleitungs-Fenster laufen. Automatisch mit Windows
            starten: <Code>Win + R</Code> → <Code>shell:startup</Code> → Verknüpfung zu start-weiterleitung.bat
            hineinlegen.
          </li>
          <li>
            Videos laufen im Tesla wie üblich <b>nur im Stand</b>.
          </li>
        </ul>
        <Tip>Gratis-TV und YouTube brauchen den PC nicht.</Tip>
      </Section>
    </div>
  );
}

function Section({ letter, title, children }: { letter: string; title: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-3xl bg-panel p-5 ring-1 ring-line sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold sm:text-2xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-accent">
          {letter}
        </span>
        {title}
      </h2>
      <div className="space-y-3 text-base leading-relaxed text-white/85 sm:text-lg">{children}</div>
    </section>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2.5 pl-6 marker:font-semibold marker:text-accent">{children}</ol>;
}

function Tip({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-accent/10 px-4 py-3 text-accent">{children}</p>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>;
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-accent underline-offset-4 hover:underline">
      {children}
      <ExternalLink className="h-4 w-4 shrink-0" />
    </a>
  );
}

/** Wert mit Kopier-Knopf (z. B. Server-Adresse) */
function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex max-w-full items-center gap-2 align-middle">
      <Code>{value}</Code>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        aria-label="Kopieren"
        className="rounded-full p-1.5 text-white/60 hover:bg-white/10"
      >
        {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
      </button>
    </span>
  );
}
