import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { LoteRecepcion, LoteRecepcionCreateRequest } from '@/types/lote-recepcion';

const BASE = API_ENDPOINTS.operarioLotesRecepcion;

export async function getLotesRecepcion(): Promise<LoteRecepcion[]> {
  const { data } = await apiClient.get<LoteRecepcion[]>(BASE);
  return data;
}

export async function getLoteRecepcionById(id: number): Promise<LoteRecepcion> {
  const { data } = await apiClient.get<LoteRecepcion>(`${BASE}/${id}`);
  return data;
}

export async function createLoteRecepcion(
  body: LoteRecepcionCreateRequest
): Promise<LoteRecepcion> {
  const { data } = await apiClient.post<LoteRecepcion>(BASE, body);
  return data;
}

export async function addGuiasToLoteRecepcion(
  id: number,
  numeroGuiasEnvio: string[]
): Promise<LoteRecepcion> {
  const { data } = await apiClient.post<LoteRecepcion>(`${BASE}/${id}/guias`, {
    numeroGuiasEnvio,
  });
  return data;
}

export interface DeleteLoteRecepcionResponse {
  paquetesRevertidos: number;
}

export async function deleteLoteRecepcion(id: number): Promise<DeleteLoteRecepcionResponse> {
  const { data } = await apiClient.delete<DeleteLoteRecepcionResponse>(`${BASE}/${id}`);
  return data;
}
