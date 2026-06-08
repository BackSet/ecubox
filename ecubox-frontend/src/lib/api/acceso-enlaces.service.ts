import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  AccesoEnlace,
  GenerarAccesoEnlaceRequest,
  GenerarAccesoEnlaceResponse,
} from '@/types/acceso-enlace';

const BASE = API_ENDPOINTS.accesoEnlaces;

export async function getAccesoEnlaces(): Promise<AccesoEnlace[]> {
  const { data } = await apiClient.get<AccesoEnlace[]>(BASE);
  return data;
}

export async function generarAccesoEnlace(
  body: GenerarAccesoEnlaceRequest,
): Promise<GenerarAccesoEnlaceResponse> {
  const { data } = await apiClient.post<GenerarAccesoEnlaceResponse>(BASE, body);
  return data;
}

export async function revocarAccesoEnlace(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
