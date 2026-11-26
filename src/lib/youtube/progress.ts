/** „Weiterschauen“: Fortschritt pro Video, lokal gespeichert */
import { read, useStored, write } from '../storage';
import type { Video } from './api';

interface Entry {
  video: Video;
  t: number; // Sekunden
  dur: number;
  at: number; // Zeitpunkt des letzten Ansehens
}

const KEY = 'yt.progress';
const MAX = 40;

export function saveProgress(video: Video, t: number, dur: number) {
  if (video.live || !dur) return;
  const all = read<Record<string, Entry>>(KEY, {});
  // Fast fertig → gilt als gesehen, nicht mehr in „Weiterschauen“
  if (t > dur - 30 || t / dur > 0.95) delete all[video.id];
  else if (t > 20) all[video.id] = { video, t, dur, at: Date.now() };
  const kept = Object.values(all)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX);
  write(KEY, Object.fromEntries(kept.map((e) => [e.video.id, e])));
}

export function resumeAt(id: string): number {
  return read<Record<string, Entry>>(KEY, {})[id]?.t ?? 0;
}

export function useContinueWatching(): { video: Video; ratio: number }[] {
  const [all] = useStored<Record<string, Entry>>(KEY, {});
  return Object.values(all)
    .sort((a, b) => b.at - a.at)
    .map((e) => ({ video: e.video, ratio: e.t / e.dur }));
}
