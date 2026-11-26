/** Parser für M3U/M3U8-Senderlisten (#EXTM3U mit #EXTINF-Einträgen) */
import type { Channel } from './types';

const ATTR = /([\w-]+)="([^"]*)"/g;

export function parseM3u(text: string, sourceId: string): Channel[] {
  const channels: Channel[] = [];
  const lines = text.split(/\r?\n/);
  let info: { name: string; attrs: Record<string, string> } | null = null;
  let group: string | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const comma = findTitleComma(line);
      const head = line.slice(0, comma);
      const attrs: Record<string, string> = {};
      for (const m of head.matchAll(ATTR)) attrs[m[1].toLowerCase()] = m[2];
      info = { name: line.slice(comma + 1).trim(), attrs };
      group = undefined;
    } else if (line.startsWith('#EXTGRP:')) {
      group = line.slice(8).trim();
    } else if (line.startsWith('#')) {
      continue;
    } else if (info) {
      const { name, flags } = splitFlags(info.attrs['tvg-name'] && !info.name ? info.attrs['tvg-name'] : info.name);
      channels.push({
        id: `${sourceId}:${channels.length}`,
        name: name || 'Unbenannt',
        logo: info.attrs['tvg-logo'] || undefined,
        group: info.attrs['group-title'] || group || undefined,
        url: line,
        sourceId,
        flags,
      });
      info = null;
    }
  }
  return channels;
}

/** Das Komma vor dem Sendernamen – Kommas innerhalb von Anführungszeichen zählen nicht */
function findTitleComma(line: string): number {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) return i;
  }
  return line.length;
}

/** „Sender (1080p) [Geo-blocked]“ → Name „Sender“, Hinweise ["1080p", "Geo-blocked"] */
function splitFlags(title: string): { name: string; flags: string[] } {
  const flags: string[] = [];
  const name = title
    .replace(/\s*[[(]([^\])]+)[\])]/g, (_, f: string) => {
      flags.push(f.trim());
      return '';
    })
    .trim();
  return { name: name || title, flags };
}
