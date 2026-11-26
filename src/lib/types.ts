/** Gemeinsames Datenmodell für alle Senderquellen */

export interface Channel {
  /** Eindeutig über alle Quellen: `${sourceId}:${lokaleId}` */
  id: string;
  name: string;
  logo?: string;
  group?: string;
  url: string;
  sourceId: string;
  /** Xtream-Sender-ID für die Programmvorschau */
  streamId?: number;
  /** Hinweise aus der Senderliste, z. B. „Geo-blocked“ */
  flags?: string[];
}

export type Source =
  | { id: string; kind: 'm3u'; name: string; url: string }
  | { id: string; kind: 'xtream'; name: string; server: string; username: string; password: string };

export interface EpgEntry {
  title: string;
  start: number; // ms
  end: number; // ms
}
