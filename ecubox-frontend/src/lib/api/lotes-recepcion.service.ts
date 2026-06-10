import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { LoteRecepcion, LoteRecepcionCreateRequest } from '@/types/lote-recepcion';
import type { PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.operarioLotesRecepcion;

export async function getLotesRecepcion(): Promise<LoteRecepcion[]> {
  const { data } = await apiClient.get<LoteRecepcion[]>(BASE);
  return data;
}

export interface LoteRecepcionListParams {
  /** Búsqueda libre: #, observaciones, operario o número de guía. */
  q?: string;
  /** Nombre exacto de operario. */
  operario?: string;
  /** Rango de fechas (inclusive), formato yyyy-MM-dd. */
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}

export async function getLotesRecepcionPaginated(
  params: LoteRecepcionListParams = {}
): Promise<PageResponse<LoteRecepcion>> {
  const { data } = await apiClient.get<PageResponse<LoteRecepcion>>(`${BASE}/page`, {
    params,
  });
  return data;
}

/** Resumen liviano del listado: KPIs y operarios distintos para el filtro. */
export interface LoteRecepcionResumen {
  total: number;
  paquetes: number;
  guiasUnicas: number;
  hoy: number;
  operarios: string[];
}

export async function getLoteRecepcionResumen(): Promise<LoteRecepcionResumen> {
  const { data } = await apiClient.get<LoteRecepcionResumen>(`${BASE}/resumen`);
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
