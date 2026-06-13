import type {
  GranularidadEstadisticas,
  PresetPeriodoEstadisticas,
} from '@/types/estadisticas';

/** Slugs de preset usados en la URL (fuente de verdad de la selección). */
export type PresetSlug =
  | 'este-mes'
  | 'mes-anterior'
  | 'mes'
  | 'ultimos-3-meses'
  | 'ultimos-6-meses'
  | 'ultimos-12-meses'
  | 'ultimos-24-meses'
  | 'este-anio'
  | 'anio-anterior'
  | 'rango';

export interface EstadisticasSearch {
  preset: PresetSlug;
  /** Solo para `preset=mes`. */
  anio?: number;
  mes?: number;
  /** Solo para `preset=rango`; fechas inclusivas legibles. */
  desde?: string;
  hasta?: string;
  /** Override opcional de granularidad. */
  gran?: GranularidadEstadisticas;
}

export interface EstadisticasApiParams {
  preset?: PresetPeriodoEstadisticas;
  anio?: number;
  mes?: number;
  desde?: string;
  hasta?: string;
  granularidad?: GranularidadEstadisticas;
}

export interface PresetOption {
  slug: PresetSlug;
  label: string;
}

/** Opciones del selector compacto, en el orden pedido por el producto. */
export const PRESET_OPTIONS: PresetOption[] = [
  { slug: 'este-mes', label: 'Este mes' },
  { slug: 'mes-anterior', label: 'Mes anterior' },
  { slug: 'mes', label: 'Elegir mes' },
  { slug: 'ultimos-3-meses', label: 'Últimos 3 meses' },
  { slug: 'ultimos-6-meses', label: 'Últimos 6 meses' },
  { slug: 'ultimos-12-meses', label: 'Últimos 12 meses' },
  { slug: 'ultimos-24-meses', label: 'Últimos 24 meses' },
  { slug: 'este-anio', label: 'Este año' },
  { slug: 'anio-anterior', label: 'Año anterior' },
  { slug: 'rango', label: 'Rango personalizado' },
];

export const GRANULARIDAD_LABEL: Record<GranularidadEstadisticas, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral',
};

export const DEFAULT_SEARCH: EstadisticasSearch = { preset: 'ultimos-12-meses' };

const PRESET_SLUGS = new Set<PresetSlug>(PRESET_OPTIONS.map((option) => option.slug));
const GRANULARIDADES = new Set<GranularidadEstadisticas>([
  'DIARIA',
  'SEMANAL',
  'MENSUAL',
  'TRIMESTRAL',
]);

const SLUG_TO_PRESET: Record<
  Exclude<PresetSlug, 'mes' | 'rango'>,
  PresetPeriodoEstadisticas
> = {
  'este-mes': 'ESTE_MES',
  'mes-anterior': 'MES_ANTERIOR',
  'ultimos-3-meses': 'ULTIMOS_3_MESES',
  'ultimos-6-meses': 'ULTIMOS_6_MESES',
  'ultimos-12-meses': 'ULTIMOS_12_MESES',
  'ultimos-24-meses': 'ULTIMOS_24_MESES',
  'este-anio': 'ESTE_ANIO',
  'anio-anterior': 'ANIO_ANTERIOR',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Suma un día a una fecha ISO inclusiva para obtener el `hasta` exclusivo del API. */
export function exclusiveEnd(inclusiveDate: string): string {
  const date = new Date(`${inclusiveDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Normaliza parámetros crudos de la URL a una selección válida. Parámetros
 * inválidos o incoherentes caen al preset seguro por defecto.
 */
export function normalizeSearch(raw: Record<string, unknown>): EstadisticasSearch {
  const presetRaw = raw.preset;
  const preset =
    typeof presetRaw === 'string' && PRESET_SLUGS.has(presetRaw as PresetSlug)
      ? (presetRaw as PresetSlug)
      : DEFAULT_SEARCH.preset;

  const gran =
    typeof raw.gran === 'string' && GRANULARIDADES.has(raw.gran as GranularidadEstadisticas)
      ? (raw.gran as GranularidadEstadisticas)
      : undefined;

  if (preset === 'mes') {
    const anio = Number(raw.anio);
    const mes = Number(raw.mes);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2999 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return DEFAULT_SEARCH;
    }
    return { preset, anio, mes, gran };
  }

  if (preset === 'rango') {
    if (!isValidIsoDate(raw.desde) || !isValidIsoDate(raw.hasta) || raw.desde > raw.hasta) {
      return DEFAULT_SEARCH;
    }
    return { preset, desde: raw.desde, hasta: raw.hasta, gran };
  }

  return { preset, gran };
}

/** Convierte la selección de URL en parámetros del API (`hasta` exclusivo). */
export function searchToApiParams(search: EstadisticasSearch): EstadisticasApiParams {
  const base: EstadisticasApiParams = search.gran ? { granularidad: search.gran } : {};

  if (search.preset === 'mes') {
    return { ...base, preset: 'MES_ESPECIFICO', anio: search.anio, mes: search.mes };
  }
  if (search.preset === 'rango') {
    return {
      ...base,
      desde: search.desde,
      hasta: search.hasta ? exclusiveEnd(search.hasta) : undefined,
    };
  }
  return { ...base, preset: SLUG_TO_PRESET[search.preset] };
}
