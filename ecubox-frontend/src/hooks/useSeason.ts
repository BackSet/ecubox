import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  resolveSeasonByDate,
  SEASONS_BY_ID,
  type SeasonDefinition,
  type SeasonVentanas,
} from '@/data/seasons';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Valor de override del tema de temporada:
 * - `'auto'`  → se resuelve por fecha (comportamiento por defecto).
 * - `'off'`   → desactiva cualquier tema (render neutro).
 * - `<id>`    → fuerza una temporada concreta.
 */
export type SeasonOverride = 'auto' | 'off' | (string & {});

/** Clave de override local; útil para previsualizar/forzar sin backend. */
const STORAGE_KEY = 'ecubox:season-override';

export interface ActiveSeason {
  season: SeasonDefinition;
  /** Estilo inline con los tokens CSS a aplicar sobre el landing-shell. */
  style: CSSProperties;
}

function leerOverrideLocal(): SeasonOverride {
  if (typeof window === 'undefined') return 'auto';
  try {
    return (window.localStorage.getItem(STORAGE_KEY) as SeasonOverride) ?? 'auto';
  } catch {
    return 'auto';
  }
}

function prefiereOscuro(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolver(
  override: SeasonOverride,
  now: Date,
  ventanas?: SeasonVentanas,
): SeasonDefinition | null {
  if (override === 'off') return null;
  if (override && override !== 'auto') return SEASONS_BY_ID[override] ?? null;
  return resolveSeasonByDate(now, ventanas);
}

export interface UseSeasonOptions {
  /**
   * Override proveniente de una fuente externa (p. ej. parámetros del sistema).
   * Tiene prioridad sobre el override local de previsualización.
   */
  override?: SeasonOverride;
  /** Overrides de ventanas por temporada (configuradas en administración). */
  ventanas?: SeasonVentanas;
  /** Fecha de referencia; por defecto la actual. Útil para pruebas. */
  now?: Date;
}

/**
 * Resuelve la temporada activa combinando fecha automática y override.
 * Prioridad: `options.override` (backend) > override local (preview) > auto.
 */
export function useSeason(options?: UseSeasonOptions): ActiveSeason | null {
  const { override, ventanas, now } = options ?? {};
  const [overrideLocal, setOverrideLocal] = useState<SeasonOverride>(leerOverrideLocal);
  const theme = useThemeStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(prefiereOscuro);

  useEffect(() => {
    function sync(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setOverrideLocal(leerOverrideLocal());
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const esOscuro = theme === 'dark' || (theme === 'system' && systemDark);

  return useMemo(() => {
    const efectivo = override ?? overrideLocal;
    const season = resolver(efectivo, now ?? new Date(), ventanas);
    if (!season) return null;
    const tokens =
      esOscuro && season.tokensDark ? { ...season.tokens, ...season.tokensDark } : season.tokens;
    return { season, style: tokens as CSSProperties };
  }, [override, overrideLocal, ventanas, now, esOscuro]);
}

/** Fija el override local de previsualización (o lo limpia con `'auto'`). */
export function setSeasonOverrideLocal(value: SeasonOverride): void {
  try {
    if (value === 'auto') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}
