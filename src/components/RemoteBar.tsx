/** Leiste auf dem Handy, solange es als Fernbedienung für das Auto gekoppelt ist */
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Link2, Loader2, Smartphone, Square, X } from 'lucide-react';
import { write } from '../lib/storage';
import { messageFromLink, type RemoteMessage } from '../lib/remote';
import type { RemoteStatus } from './PlayerContext';

export function RemoteBar({
  status,
  canStep,
  onStep,
  onStop,
  onSend,
}: {
  status: RemoteStatus;
  canStep: boolean;
  onStep: (delta: number) => void;
  onStop: () => void;
  onSend: (msg: RemoteMessage, title: string) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');

  const statusText =
    status.state === 'sending'
      ? `Sende „${status.title}“ …`
      : status.state === 'sent'
        ? `▶ ${status.title}`
        : status.state === 'error'
          ? status.message
          : 'Antippen = läuft im Auto';

  return (
    <div className="z-40 shrink-0 border-b border-accent/30 bg-sky-950/95 px-3 py-2 backdrop-blur safe-top md:px-6">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-accent">Fernbedienung fürs Auto</p>
          <p className={`flex items-center gap-1.5 truncate text-sm ${status.state === 'error' ? 'text-red-300' : 'text-white/70'}`}>
            {status.state === 'sending' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
            <span className="truncate">{statusText}</span>
          </p>
        </div>
        {canStep && (
          <>
            <BarButton label="Vorheriger Sender" onClick={() => onStep(-1)}>
              <ChevronUp className="h-5 w-5" />
            </BarButton>
            <BarButton label="Nächster Sender" onClick={() => onStep(1)}>
              <ChevronDown className="h-5 w-5" />
            </BarButton>
          </>
        )}
        <BarButton label="Link senden" onClick={() => setLinkOpen((o) => !o)} active={linkOpen}>
          <Link2 className="h-5 w-5" />
        </BarButton>
        <BarButton label="Im Auto stoppen" onClick={onStop}>
          <Square className="h-4 w-4 fill-current" />
        </BarButton>
        <BarButton label="Fernbedienung beenden" onClick={() => write('remote.active', false)}>
          <X className="h-5 w-5" />
        </BarButton>
      </div>
      {linkOpen && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const msg = messageFromLink(link);
            if (!msg) return setLinkError('Bitte einen YouTube- oder Stream-Link einfügen.');
            onSend(msg, msg.type === 'play-video' ? 'YouTube-Video' : 'Link');
            setLink('');
            setLinkError('');
            setLinkOpen(false);
          }}
        >
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="YouTube-Link einfügen"
            type="url"
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-xl bg-black/40 px-3 text-base outline-none ring-1 ring-accent/40 focus:ring-accent"
          />
          <button className="rounded-xl bg-accent px-4 font-semibold text-black">Senden</button>
        </form>
      )}
      {linkError && <p className="mt-1 text-sm text-red-300">{linkError}</p>}
    </div>
  );
}

function BarButton({ children, label, onClick, active }: { children: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95 ${active ? 'bg-accent text-black' : 'bg-white/10 text-white'}`}
    >
      {children}
    </button>
  );
}
