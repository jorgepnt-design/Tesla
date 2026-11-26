/** Favoriten, zuletzt gesehen, eigene Quellen – alles lokal gespeichert */
import { useStored } from './storage';
import { parseM3u } from './m3u';
import { loadLive } from './xtream';
import type { Channel, Source } from './types';

const MAX_RECENT = 24;

export function useFavorites() {
  const [favorites, setFavorites] = useStored<Channel[]>('favorites', []);
  const isFavorite = (c: Channel) => favorites.some((f) => f.id === c.id);
  const toggle = (c: Channel) =>
    setFavorites((list) => (list.some((f) => f.id === c.id) ? list.filter((f) => f.id !== c.id) : [c, ...list]));
  return { favorites, isFavorite, toggle };
}

export function useRecents() {
  const [recents, setRecents] = useStored<Channel[]>('recents', []);
  const add = (c: Channel) => setRecents((list) => [c, ...list.filter((r) => r.id !== c.id)].slice(0, MAX_RECENT));
  const clear = () => setRecents([]);
  return { recents, add, clear };
}

export function useSources() {
  return useStored<Source[]>('sources', []);
}

const sourceCache = new Map<string, Promise<Channel[]>>();

/** Lädt die Sender einer eigenen Quelle (mit Zwischenspeicher für diese Sitzung) */
export function loadSource(src: Source, force = false): Promise<Channel[]> {
  const key = JSON.stringify(src);
  let p = force ? undefined : sourceCache.get(key);
  if (!p) {
    p =
      src.kind === 'xtream'
        ? loadLive(src)
        : fetch(src.url).then(async (res) => {
            if (!res.ok) throw new Error(`Liste nicht erreichbar (${res.status})`);
            const text = await res.text();
            if (!text.includes('#EXTINF')) throw new Error('Das ist keine M3U-Senderliste.');
            return parseM3u(text, src.id);
          });
    p.catch(() => sourceCache.delete(key));
    sourceCache.set(key, p);
  }
  return p;
}

/** Verständliche Fehlermeldung für typische Netzwerkprobleme im Browser */
export function explainLoadError(err: unknown, url: string): string {
  if (url.startsWith('http://') && location.protocol === 'https:') {
    return 'Die Adresse beginnt mit http:// – der Browser lädt auf einer sicheren Seite nur https://-Adressen. Frag deinen Anbieter nach einer https-Adresse.';
  }
  if (err instanceof TypeError) {
    return 'Der Server ist nicht erreichbar oder erlaubt keinen Zugriff aus dem Browser (CORS). Prüfe die Adresse oder frag deinen Anbieter.';
  }
  return err instanceof Error ? err.message : 'Laden fehlgeschlagen.';
}
