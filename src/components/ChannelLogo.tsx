import { useState } from 'react';
import type { Channel } from '../lib/types';

/** Senderlogo; fehlt es oder lädt nicht, erscheinen die Initialen */
export function ChannelLogo({ channel, size }: { channel: Channel; size: number }) {
  const [broken, setBroken] = useState(false);
  const initials = channel.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5"
      style={{ width: size, height: size }}
    >
      {channel.logo && !broken ? (
        <img
          src={channel.logo}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span className="logo-fallback flex h-full w-full items-center justify-center font-bold text-white/70" style={{ fontSize: size * 0.34 }}>
          {initials || 'TV'}
        </span>
      )}
    </span>
  );
}
