import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Distribuidor, DistribuidorRequest } from '@/types/despacho';

const BASE = API_ENDPOINTS.distribuidores;

export async function getDistribuidoresAdmin(): Promise<Distribuidor[]> {
  const { data } = await apiClient.get<Distribuidor[]>(BASE);
  return data;
}

export async function getDistribuidorAdmin(id: number): Promise<Distribuidor> {
  const { data } = await apiClient.get<Distribuidor>(`${BASE}/${id}`);
  return data;
}

export async function createDistribuidor(body: DistribuidorRequest): Promise<Distribuidor> {
  const { data } = await apiClient.post<Distribuidor>(BASE, body);
  return data;
}

export async function updateDistribuidor(
  id: number,
  body: DistribuidorRequest
): Promise<Distribuidor> {
  const { data } = await apiClient.put<Distribuidor>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteDistribuidor(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
