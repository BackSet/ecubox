/** 1 lb = 0.45359237 kg (exact) */
export const LBS_TO_KG = 0.45359237;

/** 1 kg ≈ 2.20462262185 lbs */
export const KG_TO_LBS = 2.20462262185;

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * LBS_TO_KG * 100) / 100;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 100) / 100;
}

function toFiniteNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatWeightLbs(lbs: number): string {
  return `${lbs.toFixed(2)} lbs`;
}

export function formatWeightKg(kg: number): string {
  return `${kg.toFixed(2)} kg`;
}

export interface NormalizedWeight {
  lbs: number;
  kg: number;
}

export function normalizeWeight(
  pesoLbs?: number | null,
  pesoKg?: number | null,
): NormalizedWeight | null {
  const lbsRaw = toFiniteNumber(pesoLbs);
  const kgRaw = toFiniteNumber(pesoKg);

  if (lbsRaw == null && kgRaw == null) return null;

  const lbs = lbsRaw ?? kgToLbs(kgRaw!);
  const kg = kgRaw ?? lbsToKg(lbsRaw!);

  return { lbs, kg };
}

export function formatWeightInline(lbs: number, kg: number): string {
  return `${formatWeightLbs(lbs)} · ${formatWeightKg(kg)}`;
}

export function formatWeightFromValues(
  pesoLbs?: number | null,
  pesoKg?: number | null,
): string | null {
  const normalized = normalizeWeight(pesoLbs, pesoKg);
  if (!normalized) return null;
  return formatWeightInline(normalized.lbs, normalized.kg);
}
