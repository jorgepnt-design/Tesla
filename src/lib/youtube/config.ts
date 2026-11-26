/**
 * Zugangsdaten für die YouTube-Anbindung.
 * Entweder beim Build über GitHub-Variablen (VITE_YT_*) eingebaut oder in den Einstellungen eingetragen.
 * Benötigt: API-Schlüssel (YouTube Data API v3) und ein OAuth-Client vom Typ „Fernseher und Geräte mit
 * begrenzter Eingabe“ (Client-ID + Client-Secret) für die Anmeldung per Handy.
 */
import { read, useStored } from '../storage';

export interface YtConfig {
  apiKey: string;
  clientId: string;
  clientSecret: string;
}

const BUILT_IN: YtConfig = {
  apiKey: import.meta.env.VITE_YT_API_KEY ?? '',
  clientId: import.meta.env.VITE_YT_CLIENT_ID ?? '',
  clientSecret: import.meta.env.VITE_YT_CLIENT_SECRET ?? '',
};

const EMPTY: YtConfig = { apiKey: '', clientId: '', clientSecret: '' };

function merge(stored: YtConfig): YtConfig {
  return {
    apiKey: stored.apiKey || BUILT_IN.apiKey,
    clientId: stored.clientId || BUILT_IN.clientId,
    clientSecret: stored.clientSecret || BUILT_IN.clientSecret,
  };
}

export function getConfig(): YtConfig {
  return merge(read<YtConfig>('yt.config', EMPTY));
}

export function useYtConfig() {
  const [stored, setStored] = useStored<YtConfig>('yt.config', EMPTY);
  const config = merge(stored);
  return {
    config,
    stored,
    builtIn: BUILT_IN,
    setStored,
    /** Suchen und Trends gehen schon mit API-Schlüssel */
    canBrowse: !!config.apiKey,
    /** Anmelden braucht zusätzlich den OAuth-Client */
    canSignIn: !!config.apiKey && !!config.clientId && !!config.clientSecret,
  };
}
