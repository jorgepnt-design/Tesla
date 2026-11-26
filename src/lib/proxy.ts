/**
 * Weiterleitung für IPTV-Anbieter, die nur per http erreichbar sind.
 * Der Browser blockiert http-Inhalte auf einer https-Seite; die eigene Weiterleitung
 * (Ordner proxy/, läuft auf Vercel) holt sie ab und liefert sie verschlüsselt aus.
 * https-Adressen werden weiterhin direkt geladen.
 */
const DEFAULT_PROXY = import.meta.env.VITE_PROXY_URL ?? 'https://cartv-proxy.vercel.app';

export function proxyBase(): string {
  return DEFAULT_PROXY.replace(/\/+$/, '');
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
  if (res.status === 502 && needsProxy(url)) throw new Error('Die Weiterleitung erreicht deinen Anbieter nicht. Prüfe die Server-Adresse.');
  return res;
}
