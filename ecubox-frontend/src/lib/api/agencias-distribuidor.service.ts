import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AgenciaDistribuidor, AgenciaDistribuidorRequest } from '@/types/despacho';

const BASE = API_ENDPOINTS.agenciasDistribuidor;

export async function getAgenciasDistribuidorAll(): Promise<AgenciaDistribuidor[]> {
  const { data } = await apiClient.get<AgenciaDistribuidor[]>(BASE);
  return data;
}

export async function getAgenciaDistribuidor(id: number): Promise<AgenciaDistribuidor> {
  const { data } = await apiClient.get<AgenciaDistribuidor>(`${BASE}/${id}`);
  return data;
}

export async function getAgenciasDistribuidorByDistribuidorId(distribuidorId: number): Promise<AgenciaDistribuidor[]> {
  const { data } = await apiClient.get<AgenciaDistribuidor[]>(`${BASE}/por-distribuidor/${distribuidorId}`);
  return data;
}

export async function createAgenciaDistribuidor(body: AgenciaDistribuidorRequest): Promise<AgenciaDistribuidor> {
  const { data } = await apiClient.post<AgenciaDistribuidor>(BASE, body);
  return data;
}

export async function updateAgenciaDistribuidor(
  id: number,
  body: AgenciaDistribuidorRequest
): Promise<AgenciaDistribuidor> {
  const { data } = await apiClient.put<AgenciaDistribuidor>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteAgenciaDistribuidor(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
