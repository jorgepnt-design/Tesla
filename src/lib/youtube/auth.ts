/**
 * Anmeldung mit dem Google-Konto über den offiziellen Geräte-Ablauf
 * („OAuth 2.0 für Fernseher und Geräte mit begrenzter Eingabe“):
 * Das Auto zeigt einen Code, bestätigt wird am Handy unter google.com/device.
 * Tokens bleiben nur in diesem Browser.
 */
import { read, useStored, write } from '../storage';
import { getConfig } from './config';

const OAUTH = 'https://oauth2.googleapis.com';
export const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export interface YtToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: number;
  interval: number;
}

async function post(path: string, params: Record<string, string>) {
  const res = await fetch(`${OAUTH}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function startDeviceFlow(): Promise<DeviceCode> {
  const { clientId } = getConfig();
  const { ok, data } = await post('/device/code', { client_id: clientId, scope: SCOPE });
  if (!ok) {
    // In diesem Schritt zählt nur die Client-ID
    if (data.error === 'invalid_client') {
      throw new Error(
        'Google erkennt die Client-ID nicht. Neu angelegte Clients brauchen bei Google oft 5–30 Minuten, bis sie funktionieren – kurz warten und neu versuchen. Sonst prüfen, ob die Client-ID vollständig ist (endet auf .apps.googleusercontent.com).',
      );
    }
    throw new Error(describe(data.error));
  }
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url || 'https://www.google.com/device',
    expiresAt: Date.now() + data.expires_in * 1000,
    interval: Math.max(5, data.interval || 5),
  };
}

/** Fragt einmal nach, ob am Handy bestätigt wurde. null = noch warten. */
export async function pollDeviceFlow(code: DeviceCode): Promise<YtToken | null> {
  const { clientId, clientSecret } = getConfig();
  const { ok, data } = await post('/token', {
    client_id: clientId,
    client_secret: clientSecret,
    device_code: code.deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });
  if (ok) {
    const token: YtToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    write('yt.token', token);
    return token;
  }
  if (data.error === 'authorization_pending' || data.error === 'slow_down') return null;
  throw new Error(describe(data.error));
}

let refreshing: Promise<string | null> | null = null;

/** Gültiges Zugriffstoken oder null, wenn nicht angemeldet */
export async function getAccessToken(): Promise<string | null> {
  const token = read<YtToken | null>('yt.token', null);
  if (!token) return null;
  if (token.expiresAt > Date.now()) return token.accessToken;
  refreshing ??= (async () => {
    const { clientId, clientSecret } = getConfig();
    const { ok, data } = await post('/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
    });
    if (!ok) {
      // Zugriff wurde widerrufen oder ist abgelaufen → abmelden
      if (data.error === 'invalid_grant') write('yt.token', null);
      return null;
    }
    const next: YtToken = { ...token, accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    write('yt.token', next);
    return next.accessToken;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Abmelden und den Zugriff bei Google widerrufen */
export async function signOut(): Promise<void> {
  const token = read<YtToken | null>('yt.token', null);
  write('yt.token', null);
  write('yt.me', null);
  if (token) {
    await fetch(`${OAUTH}/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: token.refreshToken || token.accessToken }),
    }).catch(() => {});
  }
}

export function useSignedIn(): boolean {
  const [token] = useStored<YtToken | null>('yt.token', null);
  return !!token;
}

function describe(error?: string): string {
  switch (error) {
    case 'access_denied':
      return 'Die Anmeldung wurde am Handy abgelehnt.';
    case 'expired_token':
      return 'Der Code ist abgelaufen. Starte die Anmeldung neu.';
    case 'invalid_client':
    case 'unauthorized_client':
      return 'Das Client-Secret passt nicht zur Client-ID. Prüfe es in den Einstellungen (Clients → CarTV → Clientschlüssel).';
    case 'invalid_scope':
      return 'Für diesen OAuth-Client ist der YouTube-Zugriff nicht freigeschaltet.';
    default:
      return error ? `Anmeldung fehlgeschlagen (${error}).` : 'Anmeldung fehlgeschlagen.';
  }
}
