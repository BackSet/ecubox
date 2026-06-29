import { openapiClient, openapiPublicClient, unwrap } from '@/lib/api/openapi-client';
import { clampNonNegative, roundToDecimals, toFiniteNumber } from '@/lib/utils/decimal';

export interface TarifaCalculadora {
  tarifaPorLibra: number;
}

function normalizeTarifaPorLibra(value: unknown): number {
  const parsed = toFiniteNumber(value, 0);
  return roundToDecimals(clampNonNegative(parsed), 4);
}

/**
 * Obtiene la tarifa por libra (endpoint público, sin autenticación). Usa el
 * cliente público para no arrastrar token ni redirección por 401.
 */
export async function getTarifaCalculadoraPublic(): Promise<TarifaCalculadora> {
  const data = await unwrap(openapiPublicClient.GET('/api/config/tarifa-calculadora'));
  return {
    tarifaPorLibra: normalizeTarifaPorLibra(data?.tarifaPorLibra),
  };
}

/**
 * Obtiene la tarifa (operario/admin, con token).
 */
export async function getTarifaCalculadora(): Promise<TarifaCalculadora> {
  const data = await unwrap(openapiClient.GET('/api/operario/config/tarifa-calculadora'));
  return {
    tarifaPorLibra: normalizeTarifaPorLibra(data?.tarifaPorLibra),
  };
}

/**
 * Actualiza la tarifa por libra (operario/admin).
 */
export async function updateTarifaCalculadora(body: {
  tarifaPorLibra: number;
}): Promise<TarifaCalculadora> {
  const data = await unwrap(
    openapiClient.PUT('/api/operario/config/tarifa-calculadora', {
      body: { tarifaPorLibra: normalizeTarifaPorLibra(body.tarifaPorLibra) },
    }),
  );
  return {
    tarifaPorLibra: normalizeTarifaPorLibra(data?.tarifaPorLibra),
  };
}
