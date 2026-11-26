/**
 * CarTV-Weiterleitung für zu Hause (Windows, macOS, Linux).
 * Nutzt denselben Code wie die Vercel-Weiterleitung (../proxy/api/p.js), läuft aber über den
 * eigenen Internetanschluss – IPTV-Anbieter sperren private Anschlüsse in der Regel nicht.
 *
 * Start: node server.mjs   (Port über PORT, Standard 18787 – selten belegt)
 * Erreichbar machen: tailscale funnel --bg 18787
 */
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// Geheimer Schlüssel zum Signieren: beim ersten Start erzeugt und gespeichert
const secretFile = join(here, '.secret');
if (!process.env.PROXY_SECRET) {
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString('base64url'));
  process.env.PROXY_SECRET = readFileSync(secretFile, 'utf8').trim();
}
process.env.ALLOWED_ORIGINS ??= 'https://jorgepnt-design.github.io';

const { GET } = await import('../proxy/api/p.js');
const PORT = Number(process.env.PORT || 18787);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
    // Tailscale Funnel liefert per https aus; die Adresse für umgeschriebene Playlists muss https sein
    if (!url.pathname.startsWith('/api/p')) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('CarTV-Weiterleitung läuft.');
      return;
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const response = await GET(new Request(url, { method: req.method, headers }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body && req.method !== 'HEAD') {
      const body = Readable.fromWeb(response.body);
      req.on('close', () => body.destroy());
      body.pipe(res);
    } else res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`Die CarTV-Weiterleitung läuft bereits (Port ${PORT} ist belegt) – dieses Fenster kann geschlossen werden.`);
    process.exit(0);
  }
  throw e;
});

// Nur lokal lauschen – von außen erreichbar ist sie ausschließlich über Tailscale Funnel
server.listen(PORT, '127.0.0.1', () => {
  console.log(`CarTV-Weiterleitung läuft auf http://127.0.0.1:${PORT}`);
  console.log('Fenster offen lassen. Beenden mit Strg+C.');
});
