import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { MiDespacho, MiDespachoDetalle } from '@/types/mis-despacho';

const BASE = API_ENDPOINTS.misDespachos;

export async function listarMisDespachos(): Promise<MiDespacho[]> {
  const { data } = await apiClient.get<MiDespacho[]>(BASE);
  return data;
}

export async function obtenerMiDespacho(despachoId: number): Promise<MiDespachoDetalle> {
  const { data } = await apiClient.get<MiDespachoDetalle>(`${BASE}/${despachoId}`);
  return data;
}

export async function confirmarEntregaDespacho(despachoId: number): Promise<MiDespacho> {
  const { data } = await apiClient.post<MiDespacho>(`${BASE}/${despachoId}/confirmar-entrega`);
  return data;
}
