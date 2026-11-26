/** Einrichtung der YouTube-Anbindung: Anleitung und Eingabe der Zugangsdaten */
import { useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { PageTitle } from '../../components/ui';
import { useYtConfig, type YtConfig } from '../../lib/youtube/config';
import { clearCache } from '../../lib/youtube/api';

export function YtSetup() {
  return (
    <div className="max-w-4xl">
      <PageTitle title="YouTube einrichten" subtitle="Einmalig, dauert etwa 10 Minuten – am besten am Computer" />
      <ol className="space-y-4">
        <Step n={1} title="Google-Cloud-Projekt anlegen">
          Auf <Link href="https://console.cloud.google.com/projectcreate">console.cloud.google.com</Link> ein neues Projekt erstellen, z. B. „CarTV“.
        </Step>
        <Step n={2} title="YouTube Data API v3 aktivieren">
          Unter <Link href="https://console.cloud.google.com/apis/library/youtube.googleapis.com">APIs &amp; Dienste → Bibliothek</Link> die „YouTube Data API v3“ aktivieren.
        </Step>
        <Step n={3} title="API-Schlüssel erstellen">
          Unter <Link href="https://console.cloud.google.com/apis/credentials">Anmeldedaten</Link> → „API-Schlüssel“. Einschränken auf „Websites“ mit der Adresse dieser App und auf die YouTube Data API v3.
        </Step>
        <Step n={4} title="OAuth-Zustimmungsbildschirm">
          Typ „Extern“, App-Name „CarTV“, dich selbst unter „Testnutzer“ eintragen. (Im Testmodus musst du dich etwa alle 7 Tage neu anmelden.)
        </Step>
        <Step n={5} title="OAuth-Client erstellen">
          Anmeldedaten → „OAuth-Client-ID“ → Typ <b>„Fernseher und Geräte mit begrenzter Eingabe“</b>. Client-ID und Client-Secret kopieren.
        </Step>
      </ol>
      <div className="mt-8">
        <CredentialsForm />
      </div>
    </div>
  );
}

export function CredentialsForm({ onSaved }: { onSaved?: () => void }) {
  const { stored, builtIn, setStored } = useYtConfig();
  const [draft, setDraft] = useState<YtConfig>(stored);
  const [saved, setSaved] = useState(false);
  const field = (key: keyof YtConfig, label: string, secret = false) => (
    <label className="block">
      <span className="mb-1.5 block text-base font-medium text-white/60">
        {label}
        {builtIn[key] && !draft[key] && <span className="ml-2 text-accent">· in der App hinterlegt</span>}
      </span>
      <input
        type={secret ? 'password' : 'text'}
        value={draft[key]}
        onChange={(e) => {
          setDraft({ ...draft, [key]: e.target.value.trim() });
          setSaved(false);
        }}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-16 w-full rounded-2xl bg-panel-2 px-5 font-mono text-lg outline-none ring-1 ring-line focus:ring-accent"
      />
    </label>
  );

  return (
    <div className="space-y-4 rounded-3xl bg-panel p-4 ring-1 ring-line sm:p-6">
      {field('apiKey', 'API-Schlüssel')}
      {field('clientId', 'OAuth-Client-ID')}
      {field('clientSecret', 'OAuth-Client-Secret', true)}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={() => {
            setStored(draft);
            clearCache();
            setSaved(true);
            onSaved?.();
          }}
          className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black"
        >
          Speichern
        </button>
        {saved && <span className="text-lg text-emerald-400">Gespeichert</span>}
      </div>
      <p className="text-base text-white/40">Wird nur in diesem Browser gespeichert. Für Suche und Trends reicht der API-Schlüssel.</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 rounded-2xl bg-panel p-4 ring-1 ring-line sm:gap-5 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-accent">{n}</span>
      <span>
        <span className="block text-xl font-semibold">{title}</span>
        <span className="mt-1 block text-lg text-white/60">{children}</span>
      </span>
    </li>
  );
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline">
      {children}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
