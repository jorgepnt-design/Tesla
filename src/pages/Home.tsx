import { useEffect, useState } from 'react';
import { ChevronRight, Radio } from 'lucide-react';
import { navigate } from '../lib/router';
import { useFavorites, useRecents, useSources } from '../lib/library';
import { COUNTRY_LISTS, TOPIC_LISTS, loadFreeList, type FreeList } from '../lib/freetv';
import type { Channel } from '../lib/types';
import { ChannelRow, Notice, SectionTitle, Spinner } from '../components/ui';
import { write } from '../lib/storage';
import { useContinueWatching } from '../lib/youtube/progress';
import { VideoRow } from '../components/VideoCard';

const HOME_LISTS = [TOPIC_LISTS.find((l) => l.id === 'news')!, COUNTRY_LISTS[0], TOPIC_LISTS.find((l) => l.id === 'kids')!];

export function HomePage() {
  const { favorites } = useFavorites();
  const { recents } = useRecents();
  const continueWatching = useContinueWatching();
  const [sources] = useSources();
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';

  return (
    <>
      <header className="pb-4">
        <h1 className="text-4xl font-bold tracking-tight">{greeting} 👋</h1>
        <p className="mt-1 text-lg text-white/55">Live-TV, dein IPTV und YouTube auf dem großen Bildschirm.</p>
      </header>

      {continueWatching.length > 0 && (
        <>
          <SectionTitle>Weiterschauen auf YouTube</SectionTitle>
          <VideoRow items={continueWatching} />
        </>
      )}

      {recents.length > 0 && (
        <>
          <SectionTitle>Zuletzt gesehen</SectionTitle>
          <ChannelRow channels={recents} />
        </>
      )}

      {favorites.length > 0 && (
        <>
          <SectionTitle>Favoriten</SectionTitle>
          <ChannelRow channels={favorites} />
        </>
      )}

      {sources.length === 0 && (
        <button
          onClick={() => navigate('/iptv')}
          className="mt-8 flex w-full items-center gap-5 rounded-3xl bg-gradient-to-r from-sky-500/20 to-violet-500/15 p-6 text-left ring-1 ring-line"
        >
          <Radio className="h-10 w-10 text-accent" />
          <span className="flex-1">
            <span className="block text-2xl font-semibold">Eigenes IPTV hinzufügen</span>
            <span className="block text-lg text-white/60">M3U-Link oder Xtream-Login deines Anbieters</span>
          </span>
          <ChevronRight className="h-8 w-8 text-white/50" />
        </button>
      )}

      {HOME_LISTS.map((list) => (
        <FreeRow key={list.id} list={list} />
      ))}
    </>
  );
}

function FreeRow({ list }: { list: FreeList }) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    loadFreeList(list)
      .then((c) => setChannels(c.slice(0, 20)))
      .catch(() => setError(true));
  }, [list]);

  return (
    <>
      <div className="mt-8 flex items-center justify-between">
        <SectionTitle>
          {list.emoji} {list.label}
        </SectionTitle>
        <button
          onClick={() => {
            write('freetv.list', list.id);
            navigate('/tv');
          }}
          className="mb-3 flex items-center gap-1 text-lg text-white/55 hover:text-white"
        >
          Alle <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {error ? (
        <Notice tone="error">Senderliste gerade nicht erreichbar.</Notice>
      ) : channels ? (
        <ChannelRow channels={channels} />
      ) : (
        <Spinner label="Lädt …" />
      )}
    </>
  );
}
