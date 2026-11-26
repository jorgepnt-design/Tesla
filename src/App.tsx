import { Gamepad2, Home, Radio, Settings, Tv, Youtube } from 'lucide-react';
import { navigate, useRoute } from './lib/router';
import { useStored } from './lib/storage';
import { PlayerProvider } from './components/PlayerContext';
import { ConsentPage } from './pages/Consent';
import { HomePage } from './pages/Home';
import { FreeTvPage } from './pages/FreeTv';
import { IptvPage } from './pages/Iptv';
import { SettingsPage } from './pages/Settings';
import { SoonPage } from './pages/Soon';
import { YouTubePage } from './pages/youtube/YouTube';
import { HelpPage } from './pages/Help';

const NAV = [
  { path: '/', label: 'Start', icon: Home },
  { path: '/tv', label: 'Gratis-TV', icon: Tv },
  { path: '/iptv', label: 'Mein IPTV', icon: Radio },
  { path: '/youtube', label: 'YouTube', icon: Youtube },
  { path: '/games', label: 'Spiele', icon: Gamepad2, soon: true },
  { path: '/settings', label: 'Einstellungen', short: 'Optionen', icon: Settings },
];

export default function App() {
  const [consent] = useStored<boolean>('consent', false);
  const path = useRoute();

  if (!consent) return <ConsentPage />;

  const page = (() => {
    switch (path) {
      case '/tv':
        return <FreeTvPage />;
      case '/iptv':
        return <IptvPage />;
      case '/settings':
        return <SettingsPage />;
      case '/youtube':
        return <YouTubePage />;
      case '/help':
        return <HelpPage />;
      case '/games':
        return <SoonPage title="Spiele" text="Spiele vom eigenen PC (über Moonlight/Sunshine) sind in Planung." />;
      default:
        return <HomePage />;
    }
  })();

  return (
    <PlayerProvider>
      <div className="flex h-full flex-col md:flex-row">
        {/* Querformat/Auto: Seitenleiste links · Hochformat/Handy: Leiste unten */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex shrink-0 items-stretch justify-around border-t border-line bg-ink/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:w-[124px] md:flex-col md:items-center md:justify-start md:gap-2 md:border-r md:border-t-0 md:bg-black/40 md:px-0 md:py-6">
          <div className="mb-4 hidden h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent md:flex">
            <Tv className="h-8 w-8" />
          </div>
          {NAV.map(({ path: p, label, short, icon: Icon, soon }) => {
            const active = path === p;
            return (
              <button
                key={p}
                onClick={() => navigate(p)}
                aria-label={label}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors md:w-[104px] md:flex-none md:py-3 md:text-sm ${
                  active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                } ${soon ? 'opacity-60' : ''}`}
              >
                <Icon className={`h-6 w-6 md:h-8 md:w-8 ${active ? 'text-accent' : ''}`} />
                <span className="max-w-full truncate md:hidden">{short ?? label}</span>
                <span className="hidden md:inline">{label}</span>
              </button>
            );
          })}
        </nav>
        <main key={path} className="fade-in min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-5 sm:px-6 md:px-10 md:py-8">
          {page}
        </main>
      </div>
    </PlayerProvider>
  );
}
