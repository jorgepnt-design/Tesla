/** Öffnet die Vollbild-Player (Live-TV und YouTube) von überall in der App */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Channel } from '../lib/types';
import type { Video } from '../lib/youtube/api';
import { useRecents } from '../lib/library';
import { Player } from './Player';
import { YtPlayer } from './YtPlayer';

interface PlayerApi {
  play: (channel: Channel, list?: Channel[]) => void;
  playVideo: (video: Video, queue?: Video[]) => void;
}

const Ctx = createContext<PlayerApi>({ play: () => {}, playVideo: () => {} });

export function usePlayer() {
  return useContext(Ctx);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [tv, setTv] = useState<{ list: Channel[]; index: number } | null>(null);
  const [yt, setYt] = useState<{ video: Video; queue: Video[] } | null>(null);
  const { add } = useRecents();

  const play = useCallback(
    (channel: Channel, list?: Channel[]) => {
      const l = list && list.some((c) => c.id === channel.id) ? list : [channel];
      setYt(null);
      setTv({ list: l, index: l.findIndex((c) => c.id === channel.id) });
      add(channel);
    },
    [add],
  );

  const playVideo = useCallback((video: Video, queue?: Video[]) => {
    setTv(null);
    setYt({ video, queue: queue && queue.some((v) => v.id === video.id) ? queue : [video] });
  }, []);

  const step = (delta: number) =>
    setTv((s) => {
      if (!s) return s;
      const index = (s.index + delta + s.list.length) % s.list.length;
      add(s.list[index]);
      return { ...s, index };
    });

  return (
    <Ctx.Provider value={{ play, playVideo }}>
      {children}
      {tv && (
        <Player
          channel={tv.list[tv.index]}
          list={tv.list}
          onPick={(c) => play(c, tv.list)}
          onStep={step}
          onClose={() => setTv(null)}
        />
      )}
      {yt && (
        <YtPlayer
          video={yt.video}
          queue={yt.queue}
          onPick={(v) => setYt({ video: v, queue: yt.queue })}
          onClose={() => setYt(null)}
        />
      )}
    </Ctx.Provider>
  );
}
