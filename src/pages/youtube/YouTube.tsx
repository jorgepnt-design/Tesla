import { useEffect, useState } from 'react';
import { LogIn, Search, X } from 'lucide-react';
import { useStored } from '../../lib/storage';
import { useYtConfig } from '../../lib/youtube/config';
import { useSignedIn } from '../../lib/youtube/auth';
import {
  likedVideos,
  liveNow,
  me,
  myPlaylists,
  playlistVideos,
  search,
  subscriptionFeed,
  trending,
  YtError,
  type Me,
  type Playlist,
  type Video,
} from '../../lib/youtube/api';
import { useContinueWatching } from '../../lib/youtube/progress';
import { Chip, Notice, PageTitle, SectionTitle, Spinner } from '../../components/ui';
import { VideoGrid, VideoRow } from '../../components/VideoCard';
import { SignInDialog } from './SignIn';
import { YtSetup } from './Setup';

type Tab = 'subs' | 'trending' | 'live' | 'liked' | 'playlists';

export function YouTubePage() {
  const { canBrowse, canSignIn } = useYtConfig();
  const signedIn = useSignedIn();
  const [tab, setTab] = useStored<Tab>('yt.tab', 'trending');
  const [signingIn, setSigningIn] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [profile, setProfile] = useState<Me | null>(null);
  const continueWatching = useContinueWatching();

  useEffect(() => {
    if (signedIn) me().then(setProfile).catch(() => setProfile(null));
    else setProfile(null);
  }, [signedIn]);

  if (!canBrowse) return <YtSetup />;

  const tabs: { id: Tab; label: string; auth?: boolean }[] = [
    { id: 'subs', label: 'Abos', auth: true },
    { id: 'trending', label: 'Trends' },
    { id: 'live', label: 'Live' },
    { id: 'liked', label: 'Mag ich', auth: true },
    { id: 'playlists', label: 'Playlists', auth: true },
  ];
  const visible = tabs.filter((t) => !t.auth || signedIn);
  const active = visible.some((t) => t.id === tab) ? tab : signedIn ? 'subs' : 'trending';

  return (
    <>
      <PageTitle
        title="YouTube"
        subtitle={profile ? `Angemeldet als ${profile.title}` : signedIn ? 'Angemeldet' : 'Offizieller YouTube-Player'}
        right={
          !signedIn &&
          canSignIn && (
            <button
              onClick={() => setSigningIn(true)}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-lg font-semibold text-black"
            >
              <LogIn className="h-5 w-5" /> Mit Handy anmelden
            </button>
          )
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
        className="mb-5 flex items-center gap-3 rounded-2xl bg-panel-2 px-5 ring-1 ring-line focus-within:ring-accent"
      >
        <Search className="h-6 w-6 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="YouTube durchsuchen"
          enterKeyHint="search"
          className="h-16 flex-1 bg-transparent text-xl outline-none placeholder:text-white/35"
        />
        {submitted && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSubmitted('');
            }}
            aria-label="Suche beenden"
            className="rounded-full p-2 text-white/60"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </form>

      {submitted ? (
        <Loader key={`q:${submitted}`} load={() => search(submitted)} label={`Suche nach „${submitted}“ …`} />
      ) : (
        <>
          {continueWatching.length > 0 && (
            <>
              <SectionTitle>Weiterschauen</SectionTitle>
              <VideoRow items={continueWatching} />
              <div className="h-6" />
            </>
          )}
          <div className="scroll-x -mx-1 mb-6 flex gap-2 overflow-x-auto px-1">
            {visible.map((t) => (
              <Chip key={t.id} active={t.id === active} onClick={() => setTab(t.id)}>
                {t.label}
              </Chip>
            ))}
          </div>
          {active === 'subs' && <Loader key="subs" load={subscriptionFeed} label="Neue Videos deiner Abos …" empty="Keine neuen Videos von deinen Abos." />}
          {active === 'trending' && <Loader key="trending" load={() => trending('DE')} label="Trends werden geladen …" />}
          {active === 'live' && <Loader key="live" load={liveNow} label="Live-Streams werden geladen …" empty="Gerade keine Live-Streams gefunden." />}
          {active === 'liked' && <Loader key="liked" load={likedVideos} label="Videos, die du magst …" empty="Noch keine Videos mit „Mag ich“." />}
          {active === 'playlists' && <Playlists />}
        </>
      )}

      {signingIn && <SignInDialog onClose={() => setSigningIn(false)} />}
    </>
  );
}

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof YtError || e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
    // Laden einmal pro Einbindung; neue Inhalte über neuen key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, error };
}

function Loader({ load, label, empty }: { load: () => Promise<Video[]>; label: string; empty?: string }) {
  const { data, error } = useLoad(load);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Spinner label={label} />;
  if (!data.length) return <Notice>{empty ?? 'Nichts gefunden.'}</Notice>;
  return <VideoGrid videos={data} />;
}

function Playlists() {
  const { data, error } = useLoad(myPlaylists);
  const [open, setOpen] = useState<Playlist | null>(null);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Spinner label="Playlists werden geladen …" />;
  if (open) {
    return (
      <>
        <button onClick={() => setOpen(null)} className="mb-5 rounded-full bg-panel-2 px-5 py-3 text-lg font-semibold ring-1 ring-line">
          ← Alle Playlists
        </button>
        <h2 className="mb-5 text-2xl font-semibold">{open.title}</h2>
        <Loader key={open.id} load={() => playlistVideos(open.id)} label="Playlist wird geladen …" empty="Diese Playlist ist leer." />
      </>
    );
  }
  if (!data.length) return <Notice>Du hast noch keine Playlists.</Notice>;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-5 gap-y-7">
      {data.map((p) => (
        <button key={p.id} onClick={() => setOpen(p)} className="text-left active:scale-[0.98]">
          <span className="relative block aspect-video overflow-hidden rounded-2xl bg-panel-2">
            {p.thumb && <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-sm font-semibold">{p.count} Videos</span>
          </span>
          <span className="mt-2.5 line-clamp-2 text-lg font-semibold">{p.title}</span>
        </button>
      ))}
    </div>
  );
}
