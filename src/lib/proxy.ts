/**
 * Weiterleitung für IPTV-Anbieter, die nur per http erreichbar sind.
 * Der Browser blockiert http-Inhalte auf einer https-Seite; die eigene Weiterleitung
 * (Ordner proxy/, läuft auf Vercel) holt sie ab und liefert sie verschlüsselt aus.
 * https-Adressen werden weiterhin direkt geladen.
 */
import { read } from './storage';

/**
 * Eingebaute Adresse: Repository-Variable PROXY_URL, sonst die Weiterleitung auf Jorges PC zu Hause
 * (Tailscale Funnel). Die Vercel-Weiterleitung (https://cartv-proxy.vercel.app) wird vom aktuellen
 * Anbieter blockiert, bleibt aber als Alternative für andere Anbieter bestehen.
 */
export const DEFAULT_PROXY = import.meta.env.VITE_PROXY_URL || 'https://book-j707v10f81.tailee718e.ts.net';

/** In den Optionen eingetragene Adresse (z. B. die Weiterleitung zu Hause) hat Vorrang */
export function proxyBase(): string {
  return (read<string>('proxy.url', '') || DEFAULT_PROXY).trim().replace(/\/+$/, '');
}

export function needsProxy(url: string): boolean {
  return url.startsWith('http://') && location.protocol === 'https:';
}

export function viaProxy(url: string): string {
  const base = proxyBase();
  return needsProxy(url) && base ? `${base}/api/p?u=${encodeURIComponent(url)}` : url;
}

/** fetch mit automatischer Weiterleitung; Fehlermeldungen der Weiterleitung werden durchgereicht */
export async function proxiedFetch(url: string): Promise<Response> {
  const res = await fetch(viaProxy(url));
  if (res.status === 403 && needsProxy(url)) {
    const text = await res.text().catch(() => '');
    const host = text.match(/Anbieter (\S+) ist nicht freigegeben/)?.[1];
    throw new Error(
      host
        ? `Die Weiterleitung kennt deinen Anbieter „${host}“ noch nicht. Er muss einmalig freigegeben werden.`
        : 'Die Weiterleitung hat die Anfrage abgelehnt.',
    );
  }
  if (res.status === 502 && needsProxy(url)) {
    const reason = (await res.text().catch(() => '')).match(/\(([^)]+)\)/)?.[1];
    const hint =
      reason === 'ENOTFOUND'
        ? 'Der Servername wurde nicht gefunden – prüfe die Server-Adresse.'
        : reason === 'ECONNREFUSED' || reason === 'ECONNRESET'
          ? 'Der Anbieter lehnt die Verbindung ab – manche Anbieter sperren Rechenzentrums-Adressen.'
          : reason === 'TimeoutError' || reason === 'ETIMEDOUT' || reason === 'UND_ERR_CONNECT_TIMEOUT'
            ? 'Der Anbieter antwortet nicht – er sperrt eventuell Rechenzentrums-Adressen oder ist gerade offline.'
            : 'Prüfe die Server-Adresse.';
    throw new Error(`Die Weiterleitung erreicht deinen Anbieter nicht${reason ? ` (${reason})` : ''}. ${hint}`);
  }
  return res;
}
