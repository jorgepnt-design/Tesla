/**
 * Client für die Xtream-Codes-API, die die meisten IPTV-Anbieter nutzen.
 * Endpunkt: {server}/player_api.php?username=…&password=…&action=…
 */
import type { Channel, EpgEntry, Source } from './types';
import { proxiedFetch } from './proxy';

type XtreamSource = Extract<Source, { kind: 'xtream' }>;

function base(src: XtreamSource): string {
  return src.server.replace(/\/+$/, '');
}

function api(src: XtreamSource, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ username: src.username, password: src.password, ...params });
  return `${base(src)}/player_api.php?${q}`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await proxiedFetch(url);
  if (!res.ok) throw new Error(`Server antwortet mit ${res.status}`);
  return res.json() as Promise<T>;
}

/** Prüft die Zugangsdaten; wirft bei falschem Login eine verständliche Meldung */
export async function checkLogin(src: XtreamSource): Promise<{ expires?: number; maxConnections?: number }> {
  const data = await getJson<{ user_info?: { auth?: number; status?: string; exp_date?: string; max_connections?: string } }>(
    api(src),
  );
  const info = data.user_info;
  if (!info || info.auth === 0) throw new Error('Benutzername oder Passwort ist falsch.');
  if (info.status && info.status !== 'Active') throw new Error(`Das Konto ist nicht aktiv (${info.status}).`);
  return {
    expires: info.exp_date ? Number(info.exp_date) * 1000 : undefined,
    maxConnections: info.max_connections ? Number(info.max_connections) : undefined,
  };
}

/** Bevorzugtes Stream-Format laut Konto: HLS, wenn erlaubt, sonst MPEG-TS */
async function preferredFormat(src: XtreamSource): Promise<'m3u8' | 'ts'> {
  try {
    const data = await getJson<{ user_info?: { allowed_output_formats?: string[] } }>(api(src));
    const formats = data.user_info?.allowed_output_formats ?? [];
    return formats.length && !formats.includes('m3u8') ? 'ts' : 'm3u8';
  } catch {
    return 'm3u8';
  }
}

export async function loadLive(src: XtreamSource): Promise<Channel[]> {
  const [format, categories, streams] = await Promise.all([
    preferredFormat(src),
    getJson<{ category_id: string; category_name: string }[]>(api(src, { action: 'get_live_categories' })),
    getJson<{ stream_id: number; name: string; stream_icon?: string; category_id?: string }[]>(
      api(src, { action: 'get_live_streams' }),
    ),
  ]);
  const names = new Map(categories.map((c) => [String(c.category_id), c.category_name]));
  return streams.map((s) => ({
    id: `${src.id}:${s.stream_id}`,
    name: s.name?.trim() || 'Unbenannt',
    logo: s.stream_icon || undefined,
    group: names.get(String(s.category_id)) || undefined,
    // HLS, wenn das Konto es erlaubt; sonst MPEG-TS (spielt der Player über mpegts.js ab)
    url: `${base(src)}/live/${encodeURIComponent(src.username)}/${encodeURIComponent(src.password)}/${s.stream_id}.${format}`,
    sourceId: src.id,
    streamId: s.stream_id,
  }));
}

/** Kurze Programmvorschau (jetzt und danach). Titel sind bei Xtream Base64-kodiert. */
export async function loadShortEpg(src: XtreamSource, streamId: number): Promise<EpgEntry[]> {
  const data = await getJson<{ epg_listings?: { title: string; start_timestamp: string; stop_timestamp: string }[] }>(
    api(src, { action: 'get_short_epg', stream_id: String(streamId), limit: '4' }),
  );
  return (data.epg_listings ?? []).map((e) => ({
    title: decodeBase64(e.title),
    start: Number(e.start_timestamp) * 1000,
    end: Number(e.stop_timestamp) * 1000,
  }));
}

function decodeBase64(s: string): string {
  try {
    const bin = atob(s);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return s;
  }
}
