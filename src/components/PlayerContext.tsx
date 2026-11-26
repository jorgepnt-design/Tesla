/**
 * Öffnet die Vollbild-Player (Live-TV und YouTube) von überall in der App.
 * Ist das Gerät als Fernbedienung gekoppelt („Vom iPhone senden“), wird stattdessen an das Auto gesendet.
 * Auf dem Auto-Bildschirm empfängt derselbe Provider die Befehle vom Handy.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Channel } from '../lib/types';
import type { Video } from '../lib/youtube/api';
import { useRecents } from '../lib/library';
import { useStored } from '../lib/storage';
import { getCarPairing, listenRemote, sendRemote, type Pairing, type RemoteMessage } from '../lib/remote';
import { Player } from './Player';
import { YtPlayer } from './YtPlayer';
import { RemoteBar } from './RemoteBar';

interface PlayerApi {
  play: (channel: Channel, list?: Channel[]) => void;
  playVideo: (video: Video, queue?: Video[]) => void;
  /** Ergebnis des letzten Sendens an das Auto (für Rückmeldungen auf dem Handy) */
  remoteStatus: RemoteStatus;
}

export type RemoteStatus = { state: 'idle' } | { state: 'sending'; title: string } | { state: 'sent'; title: string } | { state: 'error'; message: string };

const Ctx = createContext<PlayerApi>({ play: () => {}, playVideo: () => {}, remoteStatus: { state: 'idle' } });

export function usePlayer() {
  return useContext(Ctx);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [tv, setTv] = useState<{ list: Channel[]; index: number } | null>(null);
  const [yt, setYt] = useState<{ video: Video; queue: Video[] } | null>(null);
  const { add } = useRecents();
  const [phonePairing] = useStored<Pairing | null>('remote.phone', null);
  const [remoteActive] = useStored<boolean>('remote.active', false);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>({ state: 'idle' });
  // Senderliste auf dem Handy, damit hoch/runter den nächsten Sender an das Auto schickt
  const remoteList = useRef<{ list: Channel[]; index: number } | null>(null);
  const sending = remoteActive && phonePairing ? phonePairing : null;

  const send = useCallback(
    async (msg: RemoteMessage, title: string) => {
      if (!sending) return;
      setRemoteStatus({ state: 'sending', title });
      try {
        await sendRemote(sending, msg);
        setRemoteStatus({ state: 'sent', title });
      } catch (e) {
        setRemoteStatus({ state: 'error', message: e instanceof Error ? e.message : 'Senden fehlgeschlagen' });
      }
    },
    [sending],
  );

  const playLocal = useCallback(
    (channel: Channel, list?: Channel[]) => {
      const l = list && list.some((c) => c.id === channel.id) ? list : [channel];
      setYt(null);
      setTv({ list: l, index: l.findIndex((c) => c.id === channel.id) });
      add(channel);
    },
    [add],
  );

  const playVideoLocal = useCallback((video: Video, queue?: Video[]) => {
    setTv(null);
    setYt({ video, queue: queue && queue.some((v) => v.id === video.id) ? queue : [video] });
  }, []);

  const play = useCallback(
    (channel: Channel, list?: Channel[]) => {
      if (sending) {
        const l = list && list.some((c) => c.id === channel.id) ? list : [channel];
        remoteList.current = { list: l, index: l.findIndex((c) => c.id === channel.id) };
        add(channel);
        void send({ type: 'play-channel', channel }, channel.name);
        return;
      }
      playLocal(channel, list);
    },
    [sending, send, playLocal, add],
  );

  const playVideo = useCallback(
    (video: Video, queue?: Video[]) => {
      if (sending) {
        void send({ type: 'play-video', video }, video.title);
        return;
      }
      playVideoLocal(video, queue);
    },
    [sending, send, playVideoLocal],
  );

  // Auf dem Auto-Bildschirm: Befehle vom gekoppelten Handy empfangen
  const [carOnline, setCarOnline] = useState(false);
  const handlers = useRef({ playLocal, playVideoLocal });
  handlers.current = { playLocal, playVideoLocal };
  useEffect(() => {
    if (sending) return; // dieses Gerät ist die Fernbedienung
    return listenRemote(
      getCarPairing(),
      (msg) => {
        if (msg.type === 'play-channel') handlers.current.playLocal(msg.channel);
        else if (msg.type === 'play-video') handlers.current.playVideoLocal(msg.video);
        else if (msg.type === 'stop') {
          setTv(null);
          setYt(null);
        }
      },
      setCarOnline,
    );
  }, [sending]);
  void carOnline;

  const step = (delta: number) =>
    setTv((s) => {
      if (!s) return s;
      const index = (s.index + delta + s.list.length) % s.list.length;
      add(s.list[index]);
      return { ...s, index };
    });

  const remoteStep = (delta: number) => {
    const r = remoteList.current;
    if (!r || r.list.length < 2) return;
    r.index = (r.index + delta + r.list.length) % r.list.length;
    const channel = r.list[r.index];
    add(channel);
    void send({ type: 'play-channel', channel }, channel.name);
  };

  return (
    <Ctx.Provider value={{ play, playVideo, remoteStatus }}>
      <div className="flex h-full flex-col">
      {sending && (
        <RemoteBar
          status={remoteStatus}
          canStep={!!remoteList.current && remoteList.current.list.length > 1}
          onStep={remoteStep}
          onStop={() => void send({ type: 'stop' }, 'Stopp')}
          onSend={(msg, title) => void send(msg, title)}
        />
      )}
      {children}
      </div>
      {tv && (
        <Player
          channel={tv.list[tv.index]}
          list={tv.list}
          onPick={(c) => playLocal(c, tv.list)}
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
