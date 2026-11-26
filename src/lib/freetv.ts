/**
 * Gratis-TV aus der öffentlichen Senderliste des Projekts iptv-org
 * (https://github.com/iptv-org/iptv): frei empfangbare Streams, nach Land und Thema sortiert.
 */
import { parseM3u } from './m3u';
import type { Channel } from './types';

const BASE = 'https://iptv-org.github.io/iptv';

export interface FreeList {
  id: string;
  label: string;
  path: string;
  emoji: string;
}

export const COUNTRY_LISTS: FreeList[] = [
  { id: 'de', label: 'Deutschland', path: 'countries/de.m3u', emoji: '🇩🇪' },
  { id: 'at', label: 'Österreich', path: 'countries/at.m3u', emoji: '🇦🇹' },
  { id: 'ch', label: 'Schweiz', path: 'countries/ch.m3u', emoji: '🇨🇭' },
  { id: 'pt', label: 'Portugal', path: 'countries/pt.m3u', emoji: '🇵🇹' },
  { id: 'us', label: 'USA', path: 'countries/us.m3u', emoji: '🇺🇸' },
  { id: 'uk', label: 'Großbritannien', path: 'countries/uk.m3u', emoji: '🇬🇧' },
];

export const TOPIC_LISTS: FreeList[] = [
  { id: 'news', label: 'Nachrichten', path: 'categories/news.m3u', emoji: '📰' },
  { id: 'weather', label: 'Wetter', path: 'categories/weather.m3u', emoji: '🌦️' },
  { id: 'kids', label: 'Kinder', path: 'categories/kids.m3u', emoji: '🧸' },
  { id: 'animation', label: 'Zeichentrick', path: 'categories/animation.m3u', emoji: '🎨' },
  { id: 'documentary', label: 'Doku', path: 'categories/documentary.m3u', emoji: '🌍' },
  { id: 'science', label: 'Wissenschaft', path: 'categories/science.m3u', emoji: '🔭' },
  { id: 'sports', label: 'Sport', path: 'categories/sports.m3u', emoji: '⚽' },
  { id: 'music', label: 'Musik', path: 'categories/music.m3u', emoji: '🎵' },
  { id: 'movies', label: 'Filme', path: 'categories/movies.m3u', emoji: '🎬' },
  { id: 'travel', label: 'Reisen', path: 'categories/travel.m3u', emoji: '✈️' },
  { id: 'cooking', label: 'Kochen', path: 'categories/cooking.m3u', emoji: '🍳' },
  { id: 'auto', label: 'Auto', path: 'categories/auto.m3u', emoji: '🚗' },
  { id: 'relax', label: 'Entspannung', path: 'categories/relax.m3u', emoji: '🌊' },
];

const cache = new Map<string, Promise<Channel[]>>();

export function loadFreeList(list: FreeList): Promise<Channel[]> {
  let p = cache.get(list.id);
  if (!p) {
    p = fetch(`${BASE}/${list.path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Senderliste nicht erreichbar (${res.status})`);
        return res.text();
      })
      .then((text) =>
        parseM3u(text, `free-${list.id}`)
          // Nur verschlüsselt erreichbare Streams: http-Adressen blockiert der Browser auf einer https-Seite
          .filter((c) => c.url.startsWith('https://')),
      );
    p.catch(() => cache.delete(list.id));
    cache.set(list.id, p);
  }
  return p;
}
