import { useState } from 'react';
import { Check, Tv } from 'lucide-react';
import { write } from '../lib/storage';

/** Einmalige Zustimmung vor dem Start: Alter, Nutzung nur durch Mitfahrende bzw. im Stand */
export function ConsentPage() {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="fade-in w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Tv className="h-8 w-8" />
          </span>
          <span className="text-2xl font-semibold">CarTV</span>
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight">Bevor es losgeht</h1>
        <button
          onClick={() => setChecked((c) => !c)}
          className="flex w-full items-start gap-4 rounded-3xl bg-panel p-6 text-left ring-1 ring-line"
        >
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
              checked ? 'border-accent bg-accent text-black' : 'border-white/40'
            }`}
          >
            {checked && <Check className="h-6 w-6" />}
          </span>
          <span className="text-xl leading-relaxed text-white/85">
            Ich bin mindestens 18 Jahre alt. Wer fährt, schaut nicht zu und bedient CarTV nicht – Videos nur im Stand
            oder für Mitfahrende, wo das erlaubt ist.
          </span>
        </button>
        <p className="mt-5 text-base text-white/45">
          CarTV speichert nichts auf einem Server. Deine Senderlisten und Zugangsdaten bleiben in diesem Browser. Nicht
          verbunden mit Tesla oder einem anderen Fahrzeughersteller.
        </p>
        <button
          disabled={!checked}
          onClick={() => write('consent', true)}
          className="mt-8 h-16 w-full rounded-full bg-white text-xl font-semibold text-black transition disabled:bg-white/20 disabled:text-white/50"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
