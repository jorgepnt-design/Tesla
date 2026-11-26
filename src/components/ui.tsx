/** Gemeinsame Bausteine: Seitenkopf, Senderkacheln, Raster mit Suche und Gruppen */
import { useMemo, useState, type ReactNode } from 'react';
import { Heart, Loader2, Search, X } from 'lucide-react';
import type { Channel } from '../lib/types';
import { useFavorites } from '../lib/library';
import { usePlayer } from './PlayerContext';
import { ChannelLogo } from './ChannelLogo';

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-5 md:pb-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-white/55 md:text-lg">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-8 text-xl font-semibold first:mt-0 md:text-2xl">{children}</h2>;
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2.5 text-base font-medium transition-colors md:px-5 md:py-3 md:text-lg ${
        active ? 'bg-white text-black' : 'bg-panel-2 text-white/80 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-xl text-white/60">
      <Loader2 className="h-7 w-7 animate-spin" /> {label}
    </div>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return (
    <div
      className={`rounded-2xl p-5 text-lg ${
        tone === 'error' ? 'bg-red-500/10 text-red-200' : 'bg-panel-2 text-white/70'
      }`}
    >
      {children}
    </div>
  );
}

export function ChannelCard({ channel, list }: { channel: Channel; list: Channel[] }) {
  const { play } = usePlayer();
  const { isFavorite } = useFavorites();
  return (
    <button
      onClick={() => play(channel, list)}
      className="group flex w-full min-w-0 items-center gap-4 overflow-hidden rounded-2xl bg-panel p-3 text-left ring-1 ring-line transition hover:bg-panel-2 active:scale-[0.98]"
    >
      <ChannelLogo channel={channel} size={56} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold">{channel.name}</span>
        <span className="block truncate text-sm text-white/45">
          {[channel.group, ...(channel.flags ?? [])].filter(Boolean).join(' · ') || 'Live'}
        </span>
      </span>
      {isFavorite(channel) && <Heart className="h-5 w-5 shrink-0 fill-red-500 text-red-500" />}
    </button>
  );
}

/** Horizontale Reihe (Startseite) */
export function ChannelRow({ channels }: { channels: Channel[] }) {
  return (
    <div className="scroll-x -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {channels.map((c) => (
        <div key={c.id} className="w-[260px] shrink-0 md:w-[300px]">
          <ChannelCard channel={c} list={channels} />
        </div>
      ))}
    </div>
  );
}

const PAGE = 120;

/** Sendergitter mit Suche und Gruppenfilter; rendert große Listen schrittweise */
export function ChannelBrowser({ channels, emptyText }: { channels: Channel[]; emptyText?: string }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of channels) if (c.group) counts.set(c.group, (counts.get(c.group) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [channels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter(
      (c) => (!group || c.group === group) && (!q || c.name.toLowerCase().includes(q) || c.group?.toLowerCase().includes(q)),
    );
  }, [channels, query, group]);

  const shown = filtered.slice(0, limit);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-panel-2 px-5 ring-1 ring-line focus-within:ring-accent">
        <Search className="h-6 w-6 text-white/40" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder={`${channels.length} Sender durchsuchen`}
          className="h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-white/35 md:h-16 md:text-xl"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Suche leeren" className="rounded-full p-2 text-white/60">
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {groups.length > 1 && (
        <div className="scroll-x -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
          <Chip active={!group} onClick={() => setGroup(null)}>
            Alle
          </Chip>
          {groups.slice(0, 60).map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? null : g)}>
              {g}
            </Chip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Notice>{emptyText ?? 'Keine Sender gefunden.'}</Notice>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {shown.map((c) => (
            <ChannelCard key={c.id} channel={c} list={filtered} />
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + PAGE)}
          className="mx-auto mt-6 block rounded-full bg-panel-2 px-8 py-4 text-lg font-semibold ring-1 ring-line"
        >
          Mehr anzeigen ({filtered.length - limit} weitere)
        </button>
      )}
    </div>
  );
}
