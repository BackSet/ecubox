import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AgenciaCourierEntrega, AgenciaCourierEntregaRequest } from '@/types/despacho';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.puntosEntrega;

export async function getAgenciasCourierEntregaAll(): Promise<AgenciaCourierEntrega[]> {
  const { data } = await apiClient.get<AgenciaCourierEntrega[]>(BASE);
  return data;
}

export async function listarAgenciasCourierEntregaPaginado(
  params: PageQuery = {},
): Promise<PageResponse<AgenciaCourierEntrega>> {
  const { data } = await apiClient.get<PageResponse<AgenciaCourierEntrega>>(
    `${BASE}/page`,
    { params },
  );
  return data;
}

export async function getAgenciaCourierEntrega(id: number): Promise<AgenciaCourierEntrega> {
  const { data } = await apiClient.get<AgenciaCourierEntrega>(`${BASE}/${id}`);
  return data;
}

export async function getAgenciasCourierEntregaByCourierEntregaId(courierEntregaId: number): Promise<AgenciaCourierEntrega[]> {
  const { data } = await apiClient.get<AgenciaCourierEntrega[]>(`${BASE}/por-courierEntrega/${courierEntregaId}`);
  return data;
}

export async function createAgenciaCourierEntrega(body: AgenciaCourierEntregaRequest): Promise<AgenciaCourierEntrega> {
  const { data } = await apiClient.post<AgenciaCourierEntrega>(BASE, body);
  return data;
}

export async function updateAgenciaCourierEntrega(
  id: number,
  body: AgenciaCourierEntregaRequest
): Promise<AgenciaCourierEntrega> {
  const { data } = await apiClient.put<AgenciaCourierEntrega>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteAgenciaCourierEntrega(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
