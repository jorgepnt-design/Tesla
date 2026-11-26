/**
 * Vollbild-Player für Live-Sender. Nutzt das normale <video>-Element – HLS über hls.js,
 * wo der Browser es nicht selbst kann. Damit gelten alle Sperren des Fahrzeugs (z. B. kein
 * Video während der Fahrt) unverändert.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Hls from 'hls.js';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  List,
  Loader2,
  Maximize,
  Minimize,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Channel, EpgEntry, Source } from '../lib/types';
import { useFavorites } from '../lib/library';
import { read } from '../lib/storage';
import { loadShortEpg } from '../lib/xtream';
import { ChannelLogo } from './ChannelLogo';
import { needsProxy, proxyBase, viaProxy } from '../lib/proxy';

interface Props {
  channel: Channel;
  list: Channel[];
  onPick: (c: Channel) => void;
  onStep: (delta: number) => void;
  onClose: () => void;
}

type Status = { kind: 'loading' } | { kind: 'playing' } | { kind: 'error'; message: string };

function playbackError(channel: Channel, detail?: string): string {
  if (needsProxy(channel.url) && !proxyBase()) {
    return 'Dieser Sender nutzt eine unverschlüsselte http://-Adresse, die der Browser auf einer sicheren Seite blockiert.';
  }
  if (detail === 'cors' || detail === 'network') {
    return 'Der Sender ist gerade nicht erreichbar oder erlaubt keine Wiedergabe im Browser. Probier einen anderen Sender.';
  }
  return 'Dieser Sender lässt sich gerade nicht abspielen. Probier einen anderen Sender.';
}

export function Player({ channel, list, onPick, onStep, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [epg, setEpg] = useState<EpgEntry[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [detail, setDetail] = useState('');
  const hideTimer = useRef<number>();
  const { isFavorite, toggle } = useFavorites();

  // Stream laden
  useEffect(() => {
    const video = videoRef.current!;
    setStatus({ kind: 'loading' });
    setDetail('');
    let hls: Hls | null = null;

    const onPlaying = () => setStatus({ kind: 'playing' });
    const onError = () => setStatus({ kind: 'error', message: playbackError(channel, 'network') });
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    const isHls = /\.m3u8($|\?)/i.test(channel.url) || !/\.(mp4|webm|mkv|ts)($|\?)/i.test(channel.url);
    if (needsProxy(channel.url) && !proxyBase()) {
      setStatus({ kind: 'error', message: playbackError(channel) });
    } else if (isHls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false, maxBufferLength: 20, manifestLoadingMaxRetry: 2, fragLoadingMaxRetry: 3 });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        // Technische Details für die Fehlersuche (z. B. „manifestLoadError 403“)
        console.warn('hls', data.details, data.response?.code ?? '', data.url ?? '');
        setDetail([data.details, data.response?.code].filter(Boolean).join(' '));
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
          return;
        }
        setStatus({ kind: 'error', message: playbackError(channel, 'network') });
        hls?.destroy();
      });
      hls.loadSource(viaProxy(channel.url));
      hls.attachMedia(video);
    } else {
      video.src = viaProxy(channel.url);
    }
    video.play().catch(() => {
      // Autoplay mit Ton blockiert → stumm starten, Ton per Tipp
      video.muted = true;
      setMuted(true);
      video.play().catch(() => {});
    });

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [channel, attempt]);

  // Programmvorschau für Xtream-Sender
  useEffect(() => {
    setEpg([]);
    if (channel.streamId == null) return;
    const src = read<Source[]>('sources', []).find((s) => s.id === channel.sourceId);
    if (!src || src.kind !== 'xtream') return;
    let cancelled = false;
    loadShortEpg(src, channel.streamId)
      .then((e) => !cancelled && setEpg(e))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [channel]);

  // Bedienelemente nach kurzer Zeit ausblenden
  const poke = () => {
    setChrome(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChrome(false), 4000);
  };
  useEffect(() => {
    poke();
    return () => window.clearTimeout(hideTimer.current);
  }, [channel]);

  // Tastatur (Desktop): Pfeile wechseln Sender, Esc schließt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowUp') onStep(-1);
      if (e.key === 'ArrowDown') onStep(1);
      if (e.key === 'm') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleMute = () => {
    const v = videoRef.current!;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  const now = Date.now();
  const current = epg.find((e) => e.start <= now && e.end > now);
  const next = epg.find((e) => e.start > now);
  const fav = isFavorite(channel);
  const multi = list.length > 1;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 bg-black select-none"
      onPointerMove={poke}
      onClick={() => (chrome ? setChrome(false) : poke())}
    >
      <video ref={videoRef} className="h-full w-full object-contain" playsInline autoPlay />

      {status.kind === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-14 w-14 animate-spin text-white/80" />
          <p className="text-xl text-white/70">{channel.name} wird geladen …</p>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
          <div className="max-w-xl rounded-3xl bg-panel/95 p-6 text-center sm:p-8">
            <p className="text-2xl font-semibold">{channel.name}</p>
            <p className="mt-3 text-lg text-white/70">{status.message}</p>
            {detail && <p className="mt-2 font-mono text-sm text-white/35">Technisch: {detail}</p>}
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setAttempt((a) => a + 1)} className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-lg font-semibold">
                <RotateCcw className="h-5 w-5" /> Nochmal
              </button>
              {multi && (
                <button onClick={() => onStep(1)} className="rounded-full bg-accent px-6 py-3 text-lg font-semibold text-black">
                  Nächster Sender
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bedienleiste oben */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/85 to-transparent p-3 pb-12 transition-opacity sm:gap-4 sm:p-5 sm:pb-14 ${
          chrome ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <RoundButton label="Zurück" onClick={onClose}>
          <ChevronLeft className="h-8 w-8" />
        </RoundButton>
        <span className="hidden sm:block">
          <ChannelLogo channel={channel} size={56} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold sm:text-2xl">{channel.name}</p>
          <p className="truncate text-sm text-white/65 sm:text-base">
            {current ? (
              <>
                <span className="mr-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">LIVE</span>
                {current.title}
                {next && <span className="text-white/45"> · danach {fmtTime(next.start)} {next.title}</span>}
              </>
            ) : (
              <>
                <span className="mr-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">LIVE</span>
                {channel.group ?? 'Live-TV'}
              </>
            )}
          </p>
        </div>
        <RoundButton label={fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'} onClick={() => toggle(channel)}>
          <Heart className={`h-7 w-7 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
        </RoundButton>
        <RoundButton label={muted ? 'Ton an' : 'Ton aus'} onClick={toggleMute}>
          {muted ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
        </RoundButton>
        {multi && (
          <RoundButton label="Senderliste" onClick={() => setPanel((p) => !p)} active={panel}>
            <List className="h-7 w-7" />
          </RoundButton>
        )}
        <RoundButton label="Vollbild" onClick={toggleFullscreen}>
          {fullscreen ? <Minimize className="h-7 w-7" /> : <Maximize className="h-7 w-7" />}
        </RoundButton>
      </div>

      {/* Sender wechseln */}
      {multi && (
        <div
          className={`absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-4 transition-opacity sm:left-5 ${
            chrome ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <RoundButton label="Vorheriger Sender" onClick={() => onStep(-1)}>
            <ChevronUp className="h-8 w-8" />
          </RoundButton>
          <RoundButton label="Nächster Sender" onClick={() => onStep(1)}>
            <ChevronDown className="h-8 w-8" />
          </RoundButton>
        </div>
      )}

      {/* Senderliste rechts */}
      {panel && (
        <aside className="fade-in absolute inset-y-0 right-0 flex w-[380px] max-w-[85vw] flex-col bg-panel/95 backdrop-blur" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5">
            <p className="text-xl font-semibold">Sender</p>
            <RoundButton label="Schließen" onClick={() => setPanel(false)}>
              <X className="h-6 w-6" />
            </RoundButton>
          </div>
          <ul className="flex-1 overflow-y-auto px-3 pb-6">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onPick(c)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${c.id === channel.id ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'}`}
                >
                  <ChannelLogo channel={c} size={44} />
                  <span className="truncate text-lg">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function RoundButton({
  children,
  label,
  onClick,
  active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full backdrop-blur active:scale-95 sm:h-16 sm:w-16 [&_svg]:max-h-6 [&_svg]:max-w-6 sm:[&_svg]:max-h-none sm:[&_svg]:max-w-none ${
        active ? 'bg-accent text-black' : 'bg-white/12 text-white hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}
