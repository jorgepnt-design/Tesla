/** Lokale Speicherung (nur auf diesem Gerät) mit React-Hook, der zwischen Komponenten synchron bleibt */
import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'cartv.';
const EVENT = 'cartv-storage';

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder privat – dann eben nur für diese Sitzung */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function useStored<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback));

  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) setValue(read(key, fallback));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
    // fallback ist ein Startwert und darf sich nicht auf das Abo auswirken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(read(key, fallback)) : v;
      write(key, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}

export function clearAll(): void {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
}
