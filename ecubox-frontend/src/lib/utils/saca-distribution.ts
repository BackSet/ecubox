export const DEFAULT_NUM_SACAS = 1;
export const DEFAULT_MAX_POR_SACA = 5;

export type DistribucionTipo = 'manual' | 'automatica';
export type AutomaticaTipo = 'numSacas' | 'maxPorSaca';

export interface DistribucionSacasState {
  tipo: DistribucionTipo;
  manual: string;
  automaticaTipo: AutomaticaTipo;
  automaticaNumSacas: number;
  automaticaMaxPorSaca: number;
}

export function createDefaultDistribucionSacasState(
  overrides?: Partial<DistribucionSacasState>,
): DistribucionSacasState {
  return {
    tipo: 'automatica',
    manual: '',
    automaticaTipo: 'numSacas',
    automaticaNumSacas: DEFAULT_NUM_SACAS,
    automaticaMaxPorSaca: DEFAULT_MAX_POR_SACA,
    ...overrides,
  };
}

export interface AutoDistributionOptions {
  mode: AutomaticaTipo;
  value: number;
}

export function computeAutoDistribution(
  totalPaquetes: number,
  options: AutoDistributionOptions,
): number[] {
  const N = totalPaquetes;
  if (N <= 0) return [];

  const numSacas =
    options.mode === 'maxPorSaca'
      ? Math.ceil(N / Math.max(1, options.value))
      : Math.max(1, Math.min(options.value, N));

  const base = Math.floor(N / numSacas);
  const rest = N % numSacas;
  return Array.from({ length: numSacas }, (_, i) => base + (i < rest ? 1 : 0));
}

export interface ManualDistributionResult {
  ok: boolean;
  distribucion?: number[];
  error?: string;
}

export function parseManualDistribution(
  text: string,
  totalPaquetes: number,
): ManualDistributionResult {
  if (!text.trim()) {
    return { ok: false, error: 'Ingresa una distribución manual.' };
  }

  const parts = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10));

  if (parts.some((n) => Number.isNaN(n) || n < 1)) {
    return {
      ok: false,
      error: 'Solo números positivos separados por comas (ej. 1,2,4).',
    };
  }

  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== totalPaquetes) {
    return {
      ok: false,
      error: `La suma debe ser ${totalPaquetes} (paquetes ingresados).`,
    };
  }

  return { ok: true, distribucion: parts };
}

export interface ManualPreset {
  label: string;
  value: string;
}

export function buildManualPresets(totalPaquetes: number): ManualPreset[] {
  if (totalPaquetes <= 0) return [];

  const presets: ManualPreset[] = [
    {
      label: '1 por saca',
      value: Array.from({ length: totalPaquetes }, () => '1').join(','),
    },
    {
      label: `${totalPaquetes} sacas iguales`,
      value: Array.from({ length: totalPaquetes }, () => '1').join(','),
    },
  ];

  if (totalPaquetes >= 2) {
    const perSaca = Math.floor(totalPaquetes / 2);
    const rest = totalPaquetes % 2;
    presets.push({
      label: 'Reparto en 2 sacas',
      value: [perSaca + rest, perSaca].filter((n) => n > 0).join(','),
    });
  }

  return presets;
}

export function computeDistributionPreview(
  totalPaquetes: number,
  state: DistribucionSacasState,
): number[] | null {
  if (totalPaquetes <= 0) return null;

  if (state.tipo === 'manual') {
    if (!state.manual.trim()) return null;
    const parsed = parseManualDistribution(state.manual, totalPaquetes);
    return parsed.ok ? parsed.distribucion ?? null : null;
  }

  return computeAutoDistribution(totalPaquetes, {
    mode: state.automaticaTipo,
    value:
      state.automaticaTipo === 'maxPorSaca'
        ? state.automaticaMaxPorSaca
        : state.automaticaNumSacas,
  });
}

export function resolveDistributionForSubmit(
  totalPaquetes: number,
  state: DistribucionSacasState,
): ManualDistributionResult {
  if (totalPaquetes <= 0) {
    return { ok: false, error: 'Agrega al menos un paquete.' };
  }

  if (state.tipo === 'manual') {
    return parseManualDistribution(state.manual, totalPaquetes);
  }

  return {
    ok: true,
    distribucion: computeAutoDistribution(totalPaquetes, {
      mode: state.automaticaTipo,
      value:
        state.automaticaTipo === 'maxPorSaca'
          ? state.automaticaMaxPorSaca
          : state.automaticaNumSacas,
    }),
  };
}

export interface NumSacasQuickPreset {
  value: number;
  label: string;
  disabled?: boolean;
  title?: string;
}

const NUM_SACAS_BASE_PRESETS = [1, 2, 3, 5] as const;

export function buildNumSacasQuickPresets(totalPaquetes: number): NumSacasQuickPreset[] {
  const N = totalPaquetes;
  const presets: NumSacasQuickPreset[] = NUM_SACAS_BASE_PRESETS.map((n) => ({
    value: n,
    label: n === 1 ? '1 saca' : `${n} sacas`,
    disabled: N > 0 && n > N,
    title: N > 0 && n > N ? `Requiere al menos ${n} paquetes` : undefined,
  }));

  if (N > 1 && N <= 20 && !NUM_SACAS_BASE_PRESETS.includes(N as (typeof NUM_SACAS_BASE_PRESETS)[number])) {
    presets.push({
      value: N,
      label: `${N} (1 c/u)`,
      title: 'Un paquete por saca',
    });
  }

  return presets;
}

export const MAX_POR_SACA_QUICK_PRESETS = [1, 5, 10, 20] as const;
