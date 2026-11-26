import { useEffect, useState, type ReactNode } from 'react';
import { Link2, Plus, RefreshCw, Server, Trash2 } from 'lucide-react';
import { explainLoadError, loadSource, useSources } from '../lib/library';
import { checkLogin } from '../lib/xtream';
import { useStored } from '../lib/storage';
import { uid } from '../lib/uid';
import type { Channel, Source } from '../lib/types';
import { ChannelBrowser, Chip, Notice, PageTitle, Spinner } from '../components/ui';

export function IptvPage() {
  const [sources, setSources] = useSources();
  const [activeId, setActiveId] = useStored<string | null>('iptv.active', null);
  const [adding, setAdding] = useState(false);
  const active = sources.find((s) => s.id === activeId) ?? sources[0];

  if (sources.length === 0 || adding) {
    return (
      <>
        <PageTitle title="Mein IPTV" subtitle="Dein Anbieter, deine Sender – gespeichert nur in diesem Browser" />
        <AddSource
          onAdded={(s) => {
            setSources((list) => [...list, s]);
            setActiveId(s.id);
            setAdding(false);
          }}
          onCancel={sources.length ? () => setAdding(false) : undefined}
        />
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Mein IPTV"
        right={
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-full bg-panel-2 px-5 py-3 text-lg font-semibold ring-1 ring-line"
          >
            <Plus className="h-5 w-5" /> Quelle
          </button>
        }
      />
      {sources.length > 1 && (
        <div className="scroll-x -mx-1 mb-6 flex gap-2 overflow-x-auto px-1">
          {sources.map((s) => (
            <Chip key={s.id} active={s.id === active.id} onClick={() => setActiveId(s.id)}>
              {s.name}
            </Chip>
          ))}
        </div>
      )}
      <SourceChannels key={active.id} source={active} />
    </>
  );
}

function SourceChannels({ source }: { source: Source }) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setChannels(null);
    setError(null);
    loadSource(source, reload > 0)
      .then((c) => !cancelled && setChannels(c))
      .catch((e) => !cancelled && setError(explainLoadError(e, source.kind === 'm3u' ? source.url : source.server)));
    return () => {
      cancelled = true;
    };
  }, [source, reload]);

  if (error) {
    return (
      <div className="space-y-4">
        <Notice tone="error">{error}</Notice>
        <button onClick={() => setReload((r) => r + 1)} className="flex items-center gap-2 rounded-full bg-panel-2 px-6 py-3 text-lg font-semibold">
          <RefreshCw className="h-5 w-5" /> Erneut laden
        </button>
      </div>
    );
  }
  if (!channels) return <Spinner label={`${source.name} wird geladen …`} />;
  return <ChannelBrowser channels={channels} emptyText="Diese Quelle enthält keine Live-Sender." />;
}

function AddSource({ onAdded, onCancel }: { onAdded: (s: Source) => void; onCancel?: () => void }) {
  const [kind, setKind] = useState<'xtream' | 'm3u'>('xtream');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let source: Source;
      if (kind === 'm3u') {
        const clean = url.trim();
        if (!/^https?:\/\//i.test(clean)) throw new Error('Bitte einen vollständigen Link eingeben (beginnt mit https://).');
        source = { id: uid(), kind: 'm3u', name: name.trim() || hostName(clean), url: clean };
        const channels = await loadSource(source);
        if (!channels.length) throw new Error('Die Liste enthält keine Sender.');
      } else {
        let s = server.trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
        source = { id: uid(), kind: 'xtream', name: name.trim() || hostName(s), server: s, username: username.trim(), password };
        await checkLogin(source);
      }
      onAdded(source);
    } catch (e) {
      setError(explainLoadError(e, kind === 'm3u' ? url.trim() : server.trim()));
    } finally {
      setBusy(false);
    }
  };

  const ready = kind === 'm3u' ? url.trim() : server.trim() && username.trim() && password;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <KindButton active={kind === 'xtream'} onClick={() => setKind('xtream')} icon={<Server className="h-8 w-8" />} title="Xtream-Login" text="Server, Benutzername, Passwort" />
        <KindButton active={kind === 'm3u'} onClick={() => setKind('m3u')} icon={<Link2 className="h-8 w-8" />} title="M3U-Link" text="Link zu einer Senderliste" />
      </div>

      <div className="space-y-4 rounded-3xl bg-panel p-6 ring-1 ring-line">
        <Input label="Name (optional)" value={name} onChange={setName} placeholder="z. B. Mein Anbieter" />
        {kind === 'm3u' ? (
          <Input label="M3U-Link" value={url} onChange={setUrl} placeholder="https://…/playlist.m3u" type="url" />
        ) : (
          <>
            <Input label="Server" value={server} onChange={setServer} placeholder="https://anbieter.example:443" type="url" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Benutzername" value={username} onChange={setUsername} />
              <Input label="Passwort" value={password} onChange={setPassword} type="password" />
            </div>
          </>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex gap-3">
        {onCancel && (
          <button onClick={onCancel} className="h-16 flex-1 rounded-full bg-panel-2 text-xl font-semibold">
            Abbrechen
          </button>
        )}
        <button
          onClick={submit}
          disabled={!ready || busy}
          className="h-16 flex-[2] rounded-full bg-white text-xl font-semibold text-black disabled:bg-white/20 disabled:text-white/50"
        >
          {busy ? 'Wird geprüft …' : 'Hinzufügen'}
        </button>
      </div>

      <p className="text-base text-white/40">
        Nutze nur Anbieter und Listen, für die du die Rechte hast. Zugangsdaten werden ausschließlich in diesem Browser
        gespeichert und direkt an deinen Anbieter geschickt.
      </p>
    </div>
  );
}

function KindButton({ active, onClick, icon, title, text }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 rounded-3xl p-5 text-left ring-2 transition ${
        active ? 'bg-accent/10 ring-accent' : 'bg-panel ring-line'
      }`}
    >
      <span className={active ? 'text-accent' : 'text-white/50'}>{icon}</span>
      <span>
        <span className="block text-xl font-semibold">{title}</span>
        <span className="block text-base text-white/50">{text}</span>
      </span>
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-base font-medium text-white/60">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-16 w-full rounded-2xl bg-panel-2 px-5 text-xl outline-none ring-1 ring-line placeholder:text-white/30 focus:ring-accent"
      />
    </label>
  );
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'IPTV';
  }
}

export function SourceSummary({ source, onRemove }: { source: Source; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-panel p-4 ring-1 ring-line">
      {source.kind === 'xtream' ? <Server className="h-7 w-7 text-accent" /> : <Link2 className="h-7 w-7 text-accent" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-semibold">{source.name}</p>
        <p className="truncate text-base text-white/45">
          {source.kind === 'xtream' ? `Xtream · ${source.username}@${hostName(source.server)}` : `M3U · ${hostName(source.url)}`}
        </p>
      </div>
      <button onClick={onRemove} aria-label="Quelle entfernen" className="rounded-full p-3 text-red-400 hover:bg-red-500/10">
        <Trash2 className="h-6 w-6" />
      </button>
    </div>
  );
}
