import { useState } from 'react';
import { useFavorites, useRecents, useSources } from '../lib/library';
import { clearAll, useStored } from '../lib/storage';
import { Notice, PageTitle, SectionTitle } from '../components/ui';
import { SourceSummary } from './Iptv';
import { signOut, useSignedIn } from '../lib/youtube/auth';
import { useYtConfig } from '../lib/youtube/config';
import { CredentialsForm } from './youtube/Setup';

export function SettingsPage() {
  const [sources, setSources] = useSources();
  const { favorites } = useFavorites();
  const { recents, clear } = useRecents();
  const [, setConsent] = useStored<boolean>('consent', false);
  const [confirmReset, setConfirmReset] = useState(false);
  const signedIn = useSignedIn();
  const { canSignIn, canBrowse } = useYtConfig();
  const [editYt, setEditYt] = useState(false);

  return (
    <div className="max-w-3xl">
      <PageTitle title="Einstellungen" />

      <SectionTitle>IPTV-Quellen</SectionTitle>
      {sources.length === 0 ? (
        <Notice>Noch keine eigene Quelle. Füge sie unter „Mein IPTV“ hinzu.</Notice>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <SourceSummary key={s.id} source={s} onRemove={() => setSources((list) => list.filter((x) => x.id !== s.id))} />
          ))}
        </div>
      )}

      <SectionTitle>YouTube</SectionTitle>
      <div className="space-y-4 rounded-2xl bg-panel p-5 ring-1 ring-line">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xl">
            {signedIn ? 'Mit Google angemeldet' : canSignIn ? 'Nicht angemeldet' : canBrowse ? 'Nur Suche und Trends (ohne Anmeldung)' : 'Nicht eingerichtet'}
          </span>
          <div className="flex gap-2">
            {signedIn && (
              <button onClick={() => signOut()} className="rounded-full bg-panel-2 px-5 py-3 text-lg font-semibold">
                Abmelden
              </button>
            )}
            <button onClick={() => setEditYt((v) => !v)} className="rounded-full bg-panel-2 px-5 py-3 text-lg font-semibold">
              Zugangsdaten
            </button>
          </div>
        </div>
        {editYt && <CredentialsForm onSaved={() => setEditYt(false)} />}
      </div>

      <SectionTitle>Verlauf</SectionTitle>
      <div className="flex items-center justify-between rounded-2xl bg-panel p-5 ring-1 ring-line">
        <span className="text-xl">
          {recents.length} zuletzt gesehen · {favorites.length} Favoriten
        </span>
        <button onClick={clear} disabled={!recents.length} className="rounded-full bg-panel-2 px-5 py-3 text-lg font-semibold disabled:opacity-40">
          Verlauf löschen
        </button>
      </div>

      <SectionTitle>Alles zurücksetzen</SectionTitle>
      <div className="rounded-2xl bg-panel p-5 ring-1 ring-line">
        <p className="text-lg text-white/60">
          Entfernt Quellen, Zugangsdaten, Favoriten und Verlauf aus diesem Browser.
        </p>
        <button
          onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            clearAll();
            setConsent(false);
          }}
          className="mt-4 rounded-full bg-red-500/15 px-6 py-3 text-lg font-semibold text-red-300"
        >
          {confirmReset ? 'Wirklich alles löschen?' : 'Alles löschen'}
        </button>
      </div>

      <p className="mt-10 text-base text-white/35">
        CarTV by Jorge · Läuft komplett im Browser, ohne Konto und ohne Server. Nicht verbunden mit Tesla oder einem
        anderen Fahrzeughersteller. Videos nur im Stand oder für Mitfahrende, wo erlaubt.
      </p>
    </div>
  );
}
