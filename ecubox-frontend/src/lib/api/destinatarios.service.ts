import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { DestinatarioFinal, DestinatarioFinalRequest } from '@/types/destinatario';

const BASE = API_ENDPOINTS.misDestinatarios;

export async function getDestinatarios(): Promise<DestinatarioFinal[]> {
  const { data } = await apiClient.get<DestinatarioFinal[]>(BASE);
  return data;
}

export async function getDestinatario(id: number): Promise<DestinatarioFinal> {
  const { data } = await apiClient.get<DestinatarioFinal>(`${BASE}/${id}`);
  return data;
}

export async function createDestinatario(
  body: DestinatarioFinalRequest
): Promise<DestinatarioFinal> {
  const { data } = await apiClient.post<DestinatarioFinal>(BASE, body);
  return data;
}

export async function updateDestinatario(
  id: number,
  body: DestinatarioFinalRequest
): Promise<DestinatarioFinal> {
  const { data } = await apiClient.put<DestinatarioFinal>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteDestinatario(id: number): Promise<void> {
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
