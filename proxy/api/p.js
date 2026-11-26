/**
 * CarTV-Weiterleitung: holt Inhalte von IPTV-Anbietern, die nur per http erreichbar sind,
 * und liefert sie per https an die App aus (der Browser blockiert http auf https-Seiten).
 *
 * Schutz gegen Missbrauch als offener Proxy:
 *  - nur Anfragen von erlaubten App-Adressen (ALLOWED_ORIGINS)
 *  - unsignierte Ziele nur zu erlaubten Anbieter-Hosts (ALLOWED_HOSTS)
 *  - Adressen in HLS-Playlists werden umgeschrieben und signiert (PROXY_SECRET),
 *    damit Segmente auch von Weiterleitungs-Servern des Anbieters geladen werden können
 *  - keine Ziele im lokalen oder privaten Netz
 *
 * Aufruf: /api/p?u=<Ziel-URL>[&s=<Signatur>]
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const list = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const ALLOWED_ORIGINS = list(process.env.ALLOWED_ORIGINS);
// Freigegebene IPTV-Anbieter: fest hinterlegt, ergänzbar über die Umgebungsvariable ALLOWED_HOSTS
const ALLOWED_HOSTS = [...list('ip.sltv.be'), ...list(process.env.ALLOWED_HOSTS)];
const SECRET = process.env.PROXY_SECRET || '';

function sign(url) {
  return createHmac('sha256', SECRET).update(url).digest('base64url').slice(0, 27);
}

function validSignature(url, sig) {
  if (!SECRET || !sig) return false;
  const a = Buffer.from(sign(url));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isPrivateHost(host) {
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return host.startsWith('[') || host.includes(':'); // IPv6-Literale nicht erlaubt
}

function cors(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'range, content-type',
    'access-control-expose-headers': 'content-length, content-range, content-type',
    vary: 'origin',
  };
}

function error(status, message, origin) {
  return new Response(message, { status, headers: { ...cors(origin), 'content-type': 'text/plain; charset=utf-8' } });
}

/** Schreibt alle Adressen einer HLS-Playlist auf signierte Proxy-Adressen um */
function rewritePlaylist(text, base, self) {
  const wrap = (uri) => {
    const abs = new URL(uri, base).toString();
    return `${self}?u=${encodeURIComponent(abs)}&s=${sign(abs)}`;
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, u) => `URI="${wrap(u)}"`);
      return wrap(t);
    })
    .join('\n');
}

async function handle(request) {
  const origin = request.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.length && origin && !ALLOWED_ORIGINS.includes(origin.toLowerCase())) {
    return error(403, 'Origin nicht erlaubt', '');
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

  const self = new URL(request.url);
  const raw = self.searchParams.get('u');
  if (!raw) return error(400, 'Parameter u fehlt', origin);

  let target;
  try {
    target = new URL(raw);
  } catch {
    return error(400, 'Ungültige Adresse', origin);
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return error(400, 'Nur http/https', origin);
  const host = target.hostname.toLowerCase();
  if (isPrivateHost(host)) return error(403, 'Ziel nicht erlaubt', origin);

  const signed = validSignature(target.toString(), self.searchParams.get('s'));
  if (!signed && !ALLOWED_HOSTS.includes(host)) return error(403, `Anbieter ${host} ist nicht freigegeben`, origin);

  const headers = { 'user-agent': 'VLC/3.0.20 LibVLC/3.0.20', accept: '*/*' };
  const range = request.headers.get('range');
  if (range) headers.range = range;

  let upstream;
  try {
    upstream = await fetch(target, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  } catch {
    return error(502, 'Anbieter nicht erreichbar', origin);
  }

  const type = upstream.headers.get('content-type') || '';
  const isPlaylist = /mpegurl/i.test(type) || /\.m3u8($|\?)/i.test(target.pathname + target.search);
  const out = { ...cors(origin), 'cache-control': 'no-store' };

  if (isPlaylist && upstream.ok) {
    const text = await upstream.text();
    // Nur echte HLS-Playlists umschreiben; M3U-Senderlisten bleiben unverändert
    const body = /#EXT-X-/.test(text) ? rewritePlaylist(text, upstream.url || target.toString(), `${self.origin}${self.pathname}`) : text;
    return new Response(body, { status: 200, headers: { ...out, 'content-type': 'application/vnd.apple.mpegurl' } });
  }

  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) out[h] = v;
  }
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: out });
}

export const GET = handle;
export const HEAD = handle;
export const OPTIONS = handle;
