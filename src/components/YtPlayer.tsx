/**
 * Vollbild-Player mit dem offiziellen YouTube-IFrame-Player.
 * Wiedergabe, Werbung, Qualität und Untertitel steuert YouTube selbst; Sperren des Fahrzeugs gelten unverändert.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, SkipForward } from 'lucide-react';
import type { Video } from '../lib/youtube/api';
import { resumeAt, saveProgress } from '../lib/youtube/progress';

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YtPlayerApi; PlayerState: Record<string, number> };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayerApi {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

let apiReady: Promise<void> | null = null;
function loadApi(): Promise<void> {
  apiReady ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      apiReady = null;
      reject(new Error('YouTube-Player konnte nicht geladen werden.'));
    };
    document.head.appendChild(s);
  });
  return apiReady;
}

const ERRORS: Record<number, string> = {
  2: 'Ungültige Video-Adresse.',
  5: 'Dieses Video lässt sich im Browser nicht abspielen.',
  100: 'Das Video wurde entfernt oder ist privat.',
  101: 'Der Kanal erlaubt keine Wiedergabe außerhalb von YouTube.',
  150: 'Der Kanal erlaubt keine Wiedergabe außerhalb von YouTube.',
};

export function YtPlayer({ video, queue, onPick, onClose }: { video: Video; queue: Video[]; onPick: (v: Video) => void; onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayerApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const idx = queue.findIndex((v) => v.id === video.id);
  const next = idx >= 0 ? queue[idx + 1] : undefined;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setError(null);
    setEnded(false);
    const save = () => {
      const p = playerRef.current;
      if (p) saveProgress(video, p.getCurrentTime?.() ?? 0, p.getDuration?.() ?? 0);
    };

    loadApi()
      .then(() => {
        if (cancelled || !hostRef.current || !window.YT) return;
        const el = document.createElement('div');
        hostRef.current.replaceChildren(el);
        playerRef.current = new window.YT.Player(el, {
          videoId: video.id,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            start: video.live ? 0 : Math.floor(resumeAt(video.id)),
            hl: 'de',
            cc_lang_pref: 'de',
          },
          events: {
            onError: (e: { data: number }) => setError(ERRORS[e.data] ?? 'Das Video lässt sich gerade nicht abspielen.'),
            onStateChange: (e: { data: number }) => {
              if (e.data === 0) {
                save();
                setEnded(true);
              }
            },
          },
        });
        timer = window.setInterval(save, 5000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      save();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [video]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center gap-4 px-5 py-3">
        <button
          onClick={onClose}
          aria-label="Zurück"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 active:scale-95"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold">{video.title}</p>
          <p className="truncate text-base text-white/55">{video.channel}</p>
        </div>
        {next && (
          <button
            onClick={() => onPick(next)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-lg font-semibold active:scale-95"
          >
            <SkipForward className="h-5 w-5" /> Nächstes
          </button>
        )}
      </div>
      <div className="relative flex-1">
        <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
        {(error || (ended && next)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8">
            <div className="max-w-xl rounded-3xl bg-panel p-8 text-center">
              {error ? <p className="text-xl text-white/80">{error}</p> : <p className="text-xl text-white/80">Als Nächstes</p>}
              {next && (
                <button onClick={() => onPick(next)} className="mt-5 w-full rounded-2xl bg-white/5 p-3 text-left ring-1 ring-line">
                  <span className="flex items-center gap-4">
                    <img src={next.thumb} alt="" className="h-20 w-36 rounded-xl object-cover" />
                    <span className="line-clamp-2 text-lg font-semibold">{next.title}</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
