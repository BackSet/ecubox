import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EstadoRastreo,
  EstadoRastreoRequest,
  EstadoRastreoOrdenTrackingRequest,
  EstadosRastreoPorPunto,
  EstadosRastreoPorPuntoRequest,
} from '@/types/estado-rastreo';

const BASE = API_ENDPOINTS.operarioEstadosRastreo;
const CONFIG_POR_PUNTO = API_ENDPOINTS.operarioConfigEstadosRastreoPorPunto;

export async function getEstadosRastreo(): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.get<EstadoRastreo[]>(BASE);
  return data;
}

export async function getEstadosRastreoActivos(): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.get<EstadoRastreo[]>(`${BASE}/activos`);
  return data;
}

export async function getEstadoRastreoById(id: number): Promise<EstadoRastreo> {
  const { data } = await apiClient.get<EstadoRastreo>(`${BASE}/${id}`);
  return data;
}

export async function createEstadoRastreo(
  body: EstadoRastreoRequest
): Promise<EstadoRastreo> {
  const { data } = await apiClient.post<EstadoRastreo>(BASE, body);
  return data;
}

export async function updateEstadoRastreo(
  id: number,
  body: EstadoRastreoRequest
): Promise<EstadoRastreo> {
  const { data } = await apiClient.put<EstadoRastreo>(`${BASE}/${id}`, body);
  return data;
}

export async function desactivarEstadoRastreo(
  id: number
): Promise<EstadoRastreo> {
  const { data } = await apiClient.patch<EstadoRastreo>(
    `${BASE}/${id}/desactivar`
  );
  return data;
}

export async function deleteEstadoRastreo(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getEstadosRastreoPorPunto(): Promise<EstadosRastreoPorPunto> {
  const { data } = await apiClient.get<EstadosRastreoPorPunto>(CONFIG_POR_PUNTO);
  return data;
}

export async function updateEstadosRastreoPorPunto(
  body: EstadosRastreoPorPuntoRequest
): Promise<EstadosRastreoPorPunto> {
  const { data } = await apiClient.put<EstadosRastreoPorPunto>(
    CONFIG_POR_PUNTO,
    body
  );
  return data;
}

export async function reorderTrackingEstadoRastreo(
  body: EstadoRastreoOrdenTrackingRequest
): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.put<EstadoRastreo[]>(`${BASE}/orden-tracking`, body);
  return data;
}
