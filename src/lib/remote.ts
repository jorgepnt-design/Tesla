/**
 * „Vom iPhone senden“: Das Handy steuert CarTV im Auto.
 *
 * Kopplung per QR-Code: Er enthält einen zufälligen Kanalnamen und einen zufälligen Schlüssel
 * (im #-Teil der Adresse, der nie an einen Server geht). Nachrichten laufen über den öffentlichen
 * Dienst ntfy.sh und sind Ende-zu-Ende verschlüsselt (AES-GCM) – ntfy sieht nur Datensalat.
 * Das ist wichtig, weil IPTV-Adressen die Zugangsdaten des Anbieters enthalten.
 */
import { read, write } from './storage';
import type { Channel } from './types';
import type { Video } from './youtube/api';

/** Zum Testen oder für einen eigenen ntfy-Server über localStorage „cartv.remote.server“ änderbar */
function server(): string {
  return read<string>('remote.server', '') || 'https://ntfy.sh';
}

export interface Pairing {
  topic: string;
  key: string; // base64url, 32 Byte
}

export type RemoteMessage =
  | { type: 'play-channel'; channel: Channel }
  | { type: 'play-video'; video: Video }
  | { type: 'stop' }
  | { type: 'hello' };

type Envelope = RemoteMessage & { at: number };

const MAX_AGE_MS = 2 * 60_000;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function createPairing(): Pairing {
  return {
    topic: `cartv-${b64url(crypto.getRandomValues(new Uint8Array(16)))}`,
    key: b64url(crypto.getRandomValues(new Uint8Array(32))),
  };
}

/** Link, den das Handy per QR-Code öffnet */
export function pairingLink(p: Pairing): string {
  const base = location.href.split('#')[0];
  return `${base}#/remote?t=${encodeURIComponent(p.topic)}&k=${encodeURIComponent(p.key)}`;
}

/** Liest eine Kopplung aus der aufgerufenen Adresse (#/remote?t=…&k=…) */
export function pairingFromHash(hash: string): Pairing | null {
  const m = hash.match(/^#\/remote\?(.*)$/);
  if (!m) return null;
  const q = new URLSearchParams(m[1]);
  const topic = q.get('t');
  const key = q.get('k');
  return topic && key && /^[\w-]{8,64}$/.test(topic) ? { topic, key } : null;
}

async function cryptoKey(p: Pairing): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromB64url(p.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(p: Pairing, msg: RemoteMessage): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify({ ...msg, at: Date.now() } satisfies Envelope));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(p), data));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return b64url(out);
}

async function decrypt(p: Pairing, text: string): Promise<Envelope | null> {
  try {
    const raw = fromB64url(text);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, await cryptoKey(p), raw.slice(12));
    return JSON.parse(new TextDecoder().decode(plain)) as Envelope;
  } catch {
    return null; // fremde oder beschädigte Nachricht
  }
}

/** Kleinere Kanal-Objekte, damit Nachrichten unter dem ntfy-Limit (4 KB) bleiben */
function compact(msg: RemoteMessage): RemoteMessage {
  if (msg.type === 'play-channel') {
    const { id, name, logo, group, url, sourceId, streamId } = msg.channel;
    return { type: 'play-channel', channel: { id, name, logo: logo && logo.length < 300 ? logo : undefined, group, url, sourceId, streamId } };
  }
  if (msg.type === 'play-video') {
    const { id, title, channel, channelId, thumb, live, duration } = msg.video;
    return { type: 'play-video', video: { id, title: title.slice(0, 200), channel, channelId, thumb, live, duration } };
  }
  return msg;
}

export async function sendRemote(p: Pairing, msg: RemoteMessage): Promise<void> {
  const body = await encrypt(p, compact(msg));
  const res = await fetch(`${server()}/${p.topic}`, { method: 'POST', body });
  if (!res.ok) throw new Error(`Senden fehlgeschlagen (${res.status})`);
}

/** Empfängt Nachrichten (Auto-Seite). Gibt eine Funktion zum Beenden zurück. */
export function listenRemote(p: Pairing, onMessage: (m: RemoteMessage) => void, onState?: (online: boolean) => void): () => void {
  const es = new EventSource(`${server()}/${p.topic}/sse`);
  es.onopen = () => onState?.(true);
  es.onerror = () => onState?.(false);
  es.addEventListener('message', async (e) => {
    try {
      const data = JSON.parse((e as MessageEvent<string>).data) as { message?: string };
      if (!data.message) return;
      const env = await decrypt(p, data.message);
      if (!env || Math.abs(Date.now() - env.at) > MAX_AGE_MS) return;
      const { at: _at, ...msg } = env;
      void _at;
      onMessage(msg as RemoteMessage);
    } catch {
      /* ignorieren */
    }
  });
  return () => es.close();
}

/* Gespeicherte Kopplungen: „car“ = dieses Gerät empfängt, „phone“ = dieses Gerät sendet */

export function getCarPairing(): Pairing {
  let p = read<Pairing | null>('remote.car', null);
  if (!p) {
    p = createPairing();
    write('remote.car', p);
  }
  return p;
}

export function resetCarPairing(): Pairing {
  const p = createPairing();
  write('remote.car', p);
  return p;
}

/** Wird beim Start aufgerufen: Öffnet das Handy den Kopplungs-Link, wird die Fernbedienung aktiviert */
export function capturePairingFromUrl(): boolean {
  const p = pairingFromHash(location.hash);
  if (!p) return false;
  write('remote.phone', p);
  write('remote.active', true);
  history.replaceState(null, '', `${location.pathname}${location.search}#/`);
  return true;
}

/** Link aus YouTube oder ein Stream-Link → passende Nachricht */
export function messageFromLink(link: string): RemoteMessage | null {
  const text = link.trim();
  const yt = text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/))([\w-]{11})/);
  if (yt) {
    return {
      type: 'play-video',
      video: { id: yt[1], title: 'YouTube-Video', channel: '', channelId: '', thumb: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` },
    };
  }
  if (/^https?:\/\/\S+$/i.test(text)) {
    return { type: 'play-channel', channel: { id: `link:${text}`, name: 'Gesendeter Link', url: text, sourceId: 'link' } };
  }
  return null;
}
