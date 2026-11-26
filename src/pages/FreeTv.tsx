import { useEffect, useState } from 'react';
import { COUNTRY_LISTS, TOPIC_LISTS, loadFreeList } from '../lib/freetv';
import { useStored } from '../lib/storage';
import type { Channel } from '../lib/types';
import { ChannelBrowser, Chip, Notice, PageTitle, Spinner } from '../components/ui';

const ALL = [...COUNTRY_LISTS, ...TOPIC_LISTS];

export function FreeTvPage() {
  const [listId, setListId] = useStored<string>('freetv.list', 'de');
  const list = ALL.find((l) => l.id === listId) ?? ALL[0];
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setChannels(null);
    setError(null);
    loadFreeList(list)
      .then((c) => !cancelled && setChannels(c))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen'));
    return () => {
      cancelled = true;
    };
  }, [list]);

  return (
    <>
      <PageTitle title="Gratis-TV" subtitle="Frei empfangbare Sender – ohne Anmeldung" />

      <div className="scroll-x -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        {COUNTRY_LISTS.map((l) => (
          <Chip key={l.id} active={l.id === list.id} onClick={() => setListId(l.id)}>
            {l.emoji} {l.label}
          </Chip>
        ))}
      </div>
      <div className="scroll-x -mx-1 mb-6 flex gap-2 overflow-x-auto px-1">
        {TOPIC_LISTS.map((l) => (
          <Chip key={l.id} active={l.id === list.id} onClick={() => setListId(l.id)}>
            {l.emoji} {l.label}
          </Chip>
        ))}
      </div>

      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : channels ? (
        <ChannelBrowser key={list.id} channels={channels} emptyText="In dieser Liste sind gerade keine Sender verfügbar." />
      ) : (
        <Spinner label={`${list.label} wird geladen …`} />
      )}

      <p className="mt-10 text-sm text-white/35">
        Senderliste: öffentliches Verzeichnis iptv-org. Einzelne Sender können zeitweise offline oder nur in bestimmten
        Ländern verfügbar sein.
      </p>
    </>
  );
}
