import type { Video } from '../lib/youtube/api';
import { usePlayer } from './PlayerContext';

export function formatDuration(s?: number): string {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

function formatViews(n?: number): string {
  if (n == null) return '';
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. Aufrufe`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString('de-DE')} Tsd. Aufrufe`;
  return `${n} Aufrufe`;
}

function formatAge(iso?: string): string {
  if (!iso) return '';
  const days = (Date.now() - Date.parse(iso)) / 86_400_000;
  if (days < 1 / 24) return 'gerade eben';
  if (days < 1) return `vor ${Math.max(1, Math.round(days * 24))} Std.`;
  if (days < 30) return `vor ${Math.round(days)} Tag${Math.round(days) === 1 ? '' : 'en'}`;
  if (days < 365) return `vor ${Math.round(days / 30)} Monat${Math.round(days / 30) === 1 ? '' : 'en'}`;
  return `vor ${Math.round(days / 365)} Jahr${Math.round(days / 365) === 1 ? '' : 'en'}`;
}

export function VideoCard({ video, queue, ratio }: { video: Video; queue: Video[]; ratio?: number }) {
  const { playVideo } = usePlayer();
  return (
    <button onClick={() => playVideo(video, queue)} className="group block w-full min-w-0 text-left active:scale-[0.98]">
      <span className="relative block aspect-video overflow-hidden rounded-2xl bg-panel-2">
        <img src={video.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        {video.live ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-red-600 px-2 py-0.5 text-sm font-bold">LIVE</span>
        ) : (
          video.duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-sm font-semibold">
              {formatDuration(video.duration)}
            </span>
          )
        )}
        {ratio != null && (
          <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25">
            <span className="block h-full bg-red-600" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </span>
        )}
      </span>
      <span className="mt-2.5 line-clamp-2 text-lg font-semibold leading-snug">{video.title}</span>
      <span className="mt-0.5 block truncate text-base text-white/50">
        {[video.channel, video.live ? null : formatViews(video.views), formatAge(video.publishedAt)].filter(Boolean).join(' · ')}
      </span>
    </button>
  );
}

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-5 gap-y-7">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} queue={videos} />
      ))}
    </div>
  );
}

export function VideoRow({ items }: { items: { video: Video; ratio?: number }[] }) {
  const queue = items.map((i) => i.video);
  return (
    <div className="scroll-x -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {items.map(({ video, ratio }) => (
        <div key={video.id} className="w-[320px] shrink-0">
          <VideoCard video={video} queue={queue} ratio={ratio} />
        </div>
      ))}
    </div>
  );
}
