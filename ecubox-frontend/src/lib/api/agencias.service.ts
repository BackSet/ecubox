import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Agencia, AgenciaRequest } from '@/types/despacho';

const BASE = API_ENDPOINTS.agencias;

export async function getAgencias(): Promise<Agencia[]> {
  const { data } = await apiClient.get<Agencia[]>(BASE);
  return data;
}

export async function getAgencia(id: number): Promise<Agencia> {
  const { data } = await apiClient.get<Agencia>(`${BASE}/${id}`);
  return data;
}

export async function createAgencia(body: AgenciaRequest): Promise<Agencia> {
  const { data } = await apiClient.post<Agencia>(BASE, body);
  return data;
}

export async function updateAgencia(
  id: number,
  body: AgenciaRequest
): Promise<Agencia> {
  const { data } = await apiClient.put<Agencia>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteAgencia(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
