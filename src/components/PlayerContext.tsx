/** Öffnet den Vollbild-Player von überall in der App, mit der Senderliste für Weiter/Zurück */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Channel } from '../lib/types';
import { useRecents } from '../lib/library';
import { Player } from './Player';

interface PlayerApi {
  play: (channel: Channel, list?: Channel[]) => void;
}

const Ctx = createContext<PlayerApi>({ play: () => {} });

export function usePlayer() {
  return useContext(Ctx);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ list: Channel[]; index: number } | null>(null);
  const { add } = useRecents();

  const play = useCallback(
    (channel: Channel, list?: Channel[]) => {
      const l = list && list.some((c) => c.id === channel.id) ? list : [channel];
      setState({ list: l, index: l.findIndex((c) => c.id === channel.id) });
      add(channel);
    },
    [add],
  );

  const step = (delta: number) =>
    setState((s) => {
      if (!s) return s;
      const index = (s.index + delta + s.list.length) % s.list.length;
      add(s.list[index]);
      return { ...s, index };
    });

  return (
    <Ctx.Provider value={{ play }}>
      {children}
      {state && (
        <Player
          channel={state.list[state.index]}
          list={state.list}
          onPick={(c) => play(c, state.list)}
          onStep={step}
          onClose={() => setState(null)}
        />
      )}
    </Ctx.Provider>
  );
}
