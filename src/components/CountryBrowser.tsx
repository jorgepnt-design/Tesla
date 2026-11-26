/**
 * Große IPTV-Listen nach Ländern: erst Länder-Kacheln, dann Kategorien und Sender des gewählten Landes.
 * Die Suche oben durchsucht alle Sender.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import type { Channel } from '../lib/types';
import { useStored } from '../lib/storage';
import { groupByCountry, stripCountry, type Country } from '../lib/countries';
import { ChannelBrowser, ChannelCard, Notice } from './ui';

const SEARCH_LIMIT = 120;

export function CountryBrowser({ channels, storageKey }: { channels: Channel[]; storageKey: string }) {
  const groups = useMemo(() => groupByCountry(channels), [channels]);
  const [selected, setSelected] = useStored<string | null>(`iptv.country.${storageKey}`, null);
  const [query, setQuery] = useState('');
  const current = groups.find((g) => g.country.key === selected);

  // Nur ein Land (oder keine Kürzel): direkt die normale Ansicht
  if (groups.length < 2) return <ChannelBrowser channels={channels} emptyText="Diese Quelle enthält keine Live-Sender." />;

  if (current) {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 rounded-full bg-panel-2 px-4 py-2.5 text-lg font-semibold ring-1 ring-line active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" /> Alle Länder
          </button>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Flag country={current.country} size={36} /> {current.country.name}
            <span className="text-lg font-normal text-white/45">· {current.channels.length} Sender</span>
          </h2>
        </div>
        <ChannelBrowser
          key={current.country.key}
          channels={current.channels}
          groupLabel={stripCountry}
          placeholder={`In ${current.country.name} suchen`}
        />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const results = q ? channels.filter((c) => c.name.toLowerCase().includes(q)) : [];

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-panel-2 px-5 ring-1 ring-line focus-within:ring-accent">
        <Search className="h-6 w-6 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Alle ${channels.length.toLocaleString('de-DE')} Sender durchsuchen`}
          className="h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-white/35 md:h-16 md:text-xl"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Suche leeren" className="rounded-full p-2 text-white/60">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {q ? (
        results.length ? (
          <>
            <p className="mb-3 text-base text-white/50">
              {results.length.toLocaleString('de-DE')} Treffer{results.length > SEARCH_LIMIT ? ` – die ersten ${SEARCH_LIMIT}` : ''}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
              {results.slice(0, SEARCH_LIMIT).map((c) => (
                <ChannelCard key={c.id} channel={c} list={results.slice(0, SEARCH_LIMIT)} />
              ))}
            </div>
          </>
        ) : (
          <Notice>Kein Sender gefunden.</Notice>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
          {groups.map(({ country, channels: list }) => (
            <button
              key={country.key}
              onClick={() => setSelected(country.key)}
              className="flex flex-col items-start gap-1 rounded-2xl bg-panel p-4 text-left ring-1 ring-line transition hover:bg-panel-2 active:scale-[0.98]"
            >
              <Flag country={country} size={48} />
              <span className="mt-2 w-full truncate text-lg font-semibold">{country.name}</span>
              <span className="text-sm text-white/45">{list.length.toLocaleString('de-DE')} Sender</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Flagge als Bild (Windows zeigt keine Flaggen-Emojis an); Emoji als Ersatz,
 * wenn das Bild nicht lädt oder das Kürzel kein Ländercode ist.
 */
function Flag({ country, size }: { country: Country; size: number }) {
  const [failed, setFailed] = useState(false);
  const code = country.key === 'UK' ? 'gb' : country.key.toLowerCase();
  const isIso = /^[A-Z]{2}$/.test(country.key) && country.flag !== '🌍' && country.flag !== '🌐';
  if (!isIso || failed) {
    return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>{country.flag}</span>;
  }
  return (
    <img
      src={`https://flagcdn.com/h60/${code}.png`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="rounded-[4px] object-cover shadow-sm"
      style={{ height: size * 0.66, width: size }}
    />
  );
}
