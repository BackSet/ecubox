import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Consignatario, ConsignatarioRequest } from '@/types/consignatario';

const BASE = API_ENDPOINTS.misConsignatarios;

export async function getConsignatarios(): Promise<Consignatario[]> {
  const { data } = await apiClient.get<Consignatario[]>(BASE);
  return data;
}

export async function getConsignatario(id: number): Promise<Consignatario> {
  const { data } = await apiClient.get<Consignatario>(`${BASE}/${id}`);
  return data;
}

export async function createConsignatario(
  body: ConsignatarioRequest
): Promise<Consignatario> {
  const { data } = await apiClient.post<Consignatario>(BASE, body);
  return data;
}

export async function updateConsignatario(
  id: number,
  body: ConsignatarioRequest
): Promise<Consignatario> {
  const { data } = await apiClient.put<Consignatario>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteConsignatario(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export interface SugerirCodigoParams {
  nombre?: string;
  canton?: string;
  excludeId?: number;
}

export async function sugerirCodigo(
  params: SugerirCodigoParams
): Promise<{ codigo: string }> {
  const search = new URLSearchParams();
  if (params.nombre != null) search.set('nombre', params.nombre);
  if (params.canton != null) search.set('canton', params.canton);
  if (params.excludeId != null) search.set('excludeId', String(params.excludeId));
  const query = search.toString();
  const url = query ? `${BASE}/sugerir-codigo?${query}` : `${BASE}/sugerir-codigo`;
  const { data } = await apiClient.get<{ codigo: string }>(url);
  return data;
}
