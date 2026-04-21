import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Manifiesto,
  ManifiestoRequest,
  AsignarDespachosRequest,
  ManifiestoDespachoCandidato,
} from '@/types/manifiesto';

const BASE = API_ENDPOINTS.manifiestos;

export async function getManifiestos(): Promise<Manifiesto[]> {
  const { data } = await apiClient.get<Manifiesto[]>(BASE);
  return data;
}

export async function getManifiesto(id: number): Promise<Manifiesto> {
  const { data } = await apiClient.get<Manifiesto>(`${BASE}/${id}`);
  return data;
}

export async function createManifiesto(body: ManifiestoRequest): Promise<Manifiesto> {
  const { data } = await apiClient.post<Manifiesto>(BASE, body);
  return data;
}

export async function updateManifiesto(
  id: number,
  body: ManifiestoRequest
): Promise<Manifiesto> {
  const { data } = await apiClient.put<Manifiesto>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteManifiesto(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function asignarDespachos(
  id: number,
  body: AsignarDespachosRequest
): Promise<Manifiesto> {
  const { data } = await apiClient.post<Manifiesto>(`${BASE}/${id}/asignar-despachos`, body);
  return data;
}

export async function getDespachosCandidatosManifiesto(
  id: number,
): Promise<ManifiestoDespachoCandidato[]> {
  const { data } = await apiClient.get<ManifiestoDespachoCandidato[]>(
    `${BASE}/${id}/despachos-candidatos`,
  );
  return data;
}
