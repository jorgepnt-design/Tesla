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

const NAV = [
  { path: '/', label: 'Start', icon: Home },
  { path: '/tv', label: 'Gratis-TV', icon: Tv },
  { path: '/iptv', label: 'Mein IPTV', icon: Radio },
  { path: '/youtube', label: 'YouTube', icon: Youtube, soon: true },
  { path: '/games', label: 'Spiele', icon: Gamepad2, soon: true },
  { path: '/settings', label: 'Einstellungen', icon: Settings },
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
        return <SoonPage title="YouTube" text="YouTube mit deinem eigenen Konto kommt als Nächstes – über den offiziellen YouTube-Player." />;
      case '/games':
        return <SoonPage title="Spiele" text="Spiele vom eigenen PC (über Moonlight/Sunshine) sind in Planung." />;
      default:
        return <HomePage />;
    }
  })();

  return (
    <PlayerProvider>
      <div className="flex h-full">
        <nav className="flex w-[124px] shrink-0 flex-col items-center gap-2 border-r border-line bg-black/40 py-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Tv className="h-8 w-8" />
          </div>
          {NAV.map(({ path: p, label, icon: Icon, soon }) => {
            const active = path === p;
            return (
              <button
                key={p}
                onClick={() => navigate(p)}
                className={`flex w-[104px] flex-col items-center gap-1 rounded-2xl py-3 text-sm font-medium transition-colors ${
                  active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                } ${soon ? 'opacity-60' : ''}`}
              >
                <Icon className={`h-8 w-8 ${active ? 'text-accent' : ''}`} />
                {label}
              </button>
            );
          })}
        </nav>
        <main key={path} className="fade-in min-w-0 flex-1 overflow-y-auto px-10 py-8">
          {page}
        </main>
      </div>
    </PlayerProvider>
  );
}
