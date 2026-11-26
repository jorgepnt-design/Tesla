/** YouTube Data API v3 – nur lesende Abfragen */
import { getConfig } from './config';
import { getAccessToken } from './auth';

const API = 'https://www.googleapis.com/youtube/v3';

export interface Video {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  thumb: string;
  publishedAt?: string;
  duration?: number; // Sekunden
  views?: number;
  live?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  thumb: string;
  count: number;
}

export class YtError extends Error {
  constructor(
    message: string,
    public reason?: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, params: Record<string, string>, auth = false): Promise<T> {
  const q = new URLSearchParams(params);
  const headers: Record<string, string> = {};
  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new YtError('Bitte zuerst mit Google anmelden.', 'signedOut');
    headers.authorization = `Bearer ${token}`;
  } else {
    q.set('key', getConfig().apiKey);
  }
  const res = await fetch(`${API}/${path}?${q}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason: string | undefined = data?.error?.errors?.[0]?.reason;
    throw new YtError(explain(reason, data?.error?.message), reason);
  }
  return data as T;
}

function explain(reason?: string, message?: string): string {
  switch (reason) {
    case 'quotaExceeded':
    case 'dailyLimitExceeded':
      return 'Das tägliche YouTube-Kontingent des API-Schlüssels ist aufgebraucht. Morgen geht es weiter.';
    case 'keyInvalid':
    case 'badRequest':
      return 'Der YouTube-API-Schlüssel ist ungültig. Prüfe ihn in den Einstellungen.';
    case 'accessNotConfigured':
      return 'Die „YouTube Data API v3“ ist im Google-Cloud-Projekt noch nicht aktiviert.';
    case 'ipRefererBlocked':
    case 'forbidden':
      return 'Der API-Schlüssel ist für diese Adresse nicht freigegeben (Website-Einschränkung prüfen).';
    default:
      return message || 'YouTube ist gerade nicht erreichbar.';
  }
}

/** ISO-8601-Dauer (PT1H2M3S) → Sekunden */
function parseDuration(iso?: string): number | undefined {
  const m = iso?.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + +(m[4] ?? 0);
}

type Thumbs = Record<string, { url: string } | undefined>;
const bestThumb = (t?: Thumbs) => t?.maxres?.url || t?.high?.url || t?.medium?.url || t?.default?.url || '';

interface ApiVideo {
  id: string;
  snippet: { title: string; channelTitle: string; channelId: string; publishedAt: string; thumbnails: Thumbs; liveBroadcastContent?: string };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

function toVideo(v: ApiVideo): Video {
  return {
    id: v.id,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    thumb: bestThumb(v.snippet.thumbnails) || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    publishedAt: v.snippet.publishedAt,
    duration: parseDuration(v.contentDetails?.duration),
    views: v.statistics?.viewCount ? Number(v.statistics.viewCount) : undefined,
    live: v.snippet.liveBroadcastContent === 'live',
  };
}

/** Details zu bis zu 50 Videos (1 Kontingent-Einheit) */
async function videosById(ids: string[], auth = false): Promise<Video[]> {
  const unique = [...new Set(ids)].slice(0, 50);
  if (!unique.length) return [];
  const data = await get<{ items: ApiVideo[] }>(
    'videos',
    { part: 'snippet,contentDetails,statistics', id: unique.join(','), maxResults: '50' },
    auth,
  );
  const byId = new Map(data.items.map((v) => [v.id, toVideo(v)]));
  return unique.map((id) => byId.get(id)).filter((v): v is Video => !!v);
}

// Kleiner Zwischenspeicher, damit Tab-Wechsel kein Kontingent verbrauchen
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load();
  value.catch(() => cache.delete(key));
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function clearCache() {
  cache.clear();
}

const MIN = 60_000;

export function trending(region = 'DE'): Promise<Video[]> {
  return cached(`trending:${region}`, 30 * MIN, async () => {
    const data = await get<{ items: ApiVideo[] }>('videos', {
      part: 'snippet,contentDetails,statistics',
      chart: 'mostPopular',
      regionCode: region,
      maxResults: '40',
    });
    return data.items.map(toVideo);
  });
}

interface SearchItem {
  id: { videoId?: string };
}

/** Suche (100 Einheiten pro Aufruf – sparsam verwenden) */
export function search(query: string, opts: { live?: boolean } = {}): Promise<Video[]> {
  return cached(`search:${query}:${opts.live}`, 10 * MIN, async () => {
    const data = await get<{ items: SearchItem[] }>('search', {
      part: 'id',
      q: query,
      type: 'video',
      maxResults: '30',
      regionCode: 'DE',
      relevanceLanguage: 'de',
      safeSearch: 'moderate',
      ...(opts.live ? { eventType: 'live' } : {}),
    });
    return videosById(data.items.map((i) => i.id.videoId!).filter(Boolean));
  });
}

export function liveNow(): Promise<Video[]> {
  return cached('live', 15 * MIN, async () => {
    const data = await get<{ items: SearchItem[] }>('search', {
      part: 'id',
      type: 'video',
      eventType: 'live',
      order: 'viewCount',
      regionCode: 'DE',
      relevanceLanguage: 'de',
      maxResults: '30',
      safeSearch: 'moderate',
    });
    return videosById(data.items.map((i) => i.id.videoId!).filter(Boolean));
  });
}

/** Neueste Videos der abonnierten Kanäle (über die Upload-Playlists der Kanäle) */
export function subscriptionFeed(): Promise<Video[]> {
  return cached('subs', 15 * MIN, async () => {
    const subs = await get<{ items: { snippet: { resourceId: { channelId: string } } }[] }>(
      'subscriptions',
      { part: 'snippet', mine: 'true', maxResults: '50', order: 'relevance' },
      true,
    );
    const channelIds = subs.items.map((s) => s.snippet.resourceId.channelId);
    if (!channelIds.length) return [];
    const channels = await get<{ items: { id: string; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
      'channels',
      { part: 'contentDetails', id: channelIds.join(','), maxResults: '50' },
      true,
    );
    // Die 25 relevantesten Abos, je 4 neueste Videos
    const uploads = channels.items.slice(0, 25).map((c) => c.contentDetails.relatedPlaylists.uploads);
    const lists = await Promise.all(
      uploads.map((pl) =>
        get<{ items: { contentDetails: { videoId: string; videoPublishedAt?: string } }[] }>(
          'playlistItems',
          { part: 'contentDetails', playlistId: pl, maxResults: '4' },
          true,
        ).catch(() => ({ items: [] })),
      ),
    );
    const recent = lists
      .flatMap((l) => l.items.map((i) => i.contentDetails))
      .sort((a, b) => (b.videoPublishedAt ?? '').localeCompare(a.videoPublishedAt ?? ''))
      .slice(0, 50);
    const videos = await videosById(recent.map((r) => r.videoId), true);
    return videos.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  });
}

export function likedVideos(): Promise<Video[]> {
  return cached('liked', 15 * MIN, async () => {
    const data = await get<{ items: ApiVideo[] }>(
      'videos',
      { part: 'snippet,contentDetails,statistics', myRating: 'like', maxResults: '40' },
      true,
    );
    return data.items.map(toVideo);
  });
}

export function myPlaylists(): Promise<Playlist[]> {
  return cached('playlists', 15 * MIN, async () => {
    const data = await get<{ items: { id: string; snippet: { title: string; thumbnails: Thumbs }; contentDetails: { itemCount: number } }[] }>(
      'playlists',
      { part: 'snippet,contentDetails', mine: 'true', maxResults: '50' },
      true,
    );
    return data.items.map((p) => ({ id: p.id, title: p.snippet.title, thumb: bestThumb(p.snippet.thumbnails), count: p.contentDetails.itemCount }));
  });
}

export function playlistVideos(playlistId: string): Promise<Video[]> {
  return cached(`pl:${playlistId}`, 15 * MIN, async () => {
    const data = await get<{ items: { contentDetails: { videoId: string } }[] }>(
      'playlistItems',
      { part: 'contentDetails', playlistId, maxResults: '50' },
      true,
    );
    return videosById(data.items.map((i) => i.contentDetails.videoId), true);
  });
}

export interface Me {
  title: string;
  thumb: string;
}

export async function me(): Promise<Me | null> {
  const data = await get<{ items: { snippet: { title: string; thumbnails: Thumbs } }[] }>('channels', { part: 'snippet', mine: 'true' }, true);
  const c = data.items?.[0];
  return c ? { title: c.snippet.title, thumb: bestThumb(c.snippet.thumbnails) } : null;
}
