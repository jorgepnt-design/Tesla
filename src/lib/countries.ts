/**
 * Ordnet IPTV-Sender Ländern zu. Anbieter kennzeichnen Gruppen oder Sendernamen meist mit einem
 * Länderkürzel: „DE KINO 24-7“, „TR TURKIYE“, „|US| SPORTS“, „PT: CMTV HD“ …
 */
import type { Channel } from './types';

export interface Country {
  key: string; // z. B. „DE“ oder „OTHER“
  name: string;
  flag: string;
}

/** IPTV-übliche Kürzel, die keine ISO-Ländercodes sind oder anders gemeint sind */
const SPECIAL: Record<string, { name: string; flag: string }> = {
  UK: { name: 'Großbritannien', flag: '🇬🇧' },
  AR: { name: 'Arabisch', flag: '🌍' },
  ARAB: { name: 'Arabisch', flag: '🌍' },
  EXYU: { name: 'Ex-Jugoslawien', flag: '🌐' },
  YU: { name: 'Ex-Jugoslawien', flag: '🌐' },
  LAT: { name: 'Lateinamerika', flag: '🌎' },
  LATAM: { name: 'Lateinamerika', flag: '🌎' },
  LATINO: { name: 'Lateinamerika', flag: '🌎' },
  AFR: { name: 'Afrika', flag: '🌍' },
  KU: { name: 'Kurdisch', flag: '🌐' },
  KURD: { name: 'Kurdisch', flag: '🌐' },
  EN: { name: 'Englisch', flag: '🌐' },
  INT: { name: 'International', flag: '🌐' },
};

/** Länder, die zuerst erscheinen */
export const PREFERRED = ['DE', 'PT', 'AT', 'CH', 'BR', 'UK', 'US', 'FR', 'ES', 'IT', 'TR'];

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['de'], { type: 'region' });
  } catch {
    return null;
  }
})();

function flagOf(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐';
}

const cache = new Map<string, Country | null>();

/** Liefert das Land zu einem Kürzel oder null, wenn es keins ist */
export function countryFromCode(code: string): Country | null {
  if (cache.has(code)) return cache.get(code)!;
  let result: Country | null = null;
  if (SPECIAL[code]) result = { key: code, ...SPECIAL[code] };
  else if (/^[A-Z]{2}$/.test(code) && regionNames) {
    const name = regionNames.of(code);
    if (name && name !== code) result = { key: code, name, flag: flagOf(code) };
  }
  cache.set(code, result);
  return result;
}

export const OTHER: Country = { key: 'OTHER', name: 'Sonstige', flag: '📺' };

const PREFIX = /^\s*[|[(]?\s*([A-Z]{2,5})\s*[|\])]?\s*(?:[:\-–|]\s*)?/;

/** Land eines Senders – zuerst aus der Gruppe, sonst aus dem Sendernamen */
export function countryOf(channel: Channel): Country {
  for (const text of [channel.group, channel.name]) {
    const m = text?.match(PREFIX);
    if (m && m[0].length < text!.length) {
      const c = countryFromCode(m[1]);
      if (c) return c;
    }
  }
  return OTHER;
}

/** Gruppenname ohne Länderkürzel: „DE KINO 24 - 7“ → „KINO 24 - 7“ */
export function stripCountry(group: string): string {
  const m = group.match(PREFIX);
  if (m && countryFromCode(m[1]) && m[0].length < group.length) return group.slice(m[0].length).trim() || group;
  return group;
}

export interface CountryGroup {
  country: Country;
  channels: Channel[];
}

/** Sender nach Land gruppieren; bevorzugte Länder zuerst, dann nach Anzahl */
export function groupByCountry(channels: Channel[]): CountryGroup[] {
  const map = new Map<string, CountryGroup>();
  for (const ch of channels) {
    const country = countryOf(ch);
    let g = map.get(country.key);
    if (!g) map.set(country.key, (g = { country, channels: [] }));
    g.channels.push(ch);
  }
  const rank = (k: string) => {
    const i = PREFERRED.indexOf(k);
    return i < 0 ? PREFERRED.length : i;
  };
  return [...map.values()].sort((a, b) => {
    if (a.country.key === 'OTHER') return 1;
    if (b.country.key === 'OTHER') return -1;
    return rank(a.country.key) - rank(b.country.key) || b.channels.length - a.channels.length;
  });
}
