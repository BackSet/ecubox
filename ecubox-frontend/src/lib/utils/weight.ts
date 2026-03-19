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
