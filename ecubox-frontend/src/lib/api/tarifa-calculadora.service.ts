import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { apiClient } from '@/lib/api/client';
import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';
import { clampNonNegative, roundToDecimals, toFiniteNumber } from '@/lib/utils/decimal';

export interface TarifaCalculadora {
  tarifaPorLibra: number;
}

function normalizeTarifaPorLibra(value: unknown): number {
  const parsed = toFiniteNumber(value, 0);
  return roundToDecimals(clampNonNegative(parsed), 4);
}

/** Construye la URL absoluta del endpoint público de tarifa (sin token). */
function getTarifaCalculadoraPublicUrl(): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}/config/tarifa-calculadora`;
  }
  const pathFromBase = `${base.replace(/\/+$/, '')}/config/tarifa-calculadora`.replace(
    /\/+/g,
    '/',
  );
  if (typeof window !== 'undefined') {
    return new URL(pathFromBase, window.location.origin).toString();
  }
  return pathFromBase;
}

/**
 * Obtiene la tarifa por libra (endpoint público, sin autenticación).
 */
export async function getTarifaCalculadoraPublic(): Promise<TarifaCalculadora> {
  const url = getTarifaCalculadoraPublicUrl();
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(res.statusText || 'Error al obtener la tarifa.');
  }
  const data = await res.json();
  return {
    tarifaPorLibra: normalizeTarifaPorLibra(data.tarifaPorLibra),
  };
}

const OPERARIO_BASE = API_ENDPOINTS.operarioConfigTarifaCalculadora;

/**
 * Obtiene la tarifa (operario/admin, con token).
 */
export async function getTarifaCalculadora(): Promise<TarifaCalculadora> {
  const { data } = await apiClient.get<TarifaCalculadora>(OPERARIO_BASE);
  return {
    tarifaPorLibra: normalizeTarifaPorLibra(data.tarifaPorLibra),
  };
}

/**
 * Actualiza la tarifa por libra (operario/admin).
 */
export async function updateTarifaCalculadora(body: {
  tarifaPorLibra: number;
}): Promise<TarifaCalculadora> {
  const requestBody = {
    tarifaPorLibra: normalizeTarifaPorLibra(body.tarifaPorLibra),
  };
  const { data } = await apiClient.put<TarifaCalculadora>(OPERARIO_BASE, requestBody);
  return {
    tarifaPorLibra: normalizeTarifaPorLibra(data.tarifaPorLibra),
  };
}
