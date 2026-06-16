import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';
import type {
  CampaniaLanding,
  CampaniaLandingPublic,
  CampaniaLandingRequest,
} from '@/types/campania-landing';

const BASE = API_ENDPOINTS.campaniasLanding;

// -------------------------------------------------------------- administración

export async function listarCampanias(): Promise<CampaniaLanding[]> {
  const { data } = await apiClient.get<CampaniaLanding[]>(BASE);
  return data;
}

export async function obtenerCampania(id: number): Promise<CampaniaLanding> {
  const { data } = await apiClient.get<CampaniaLanding>(`${BASE}/${id}`);
  return data;
}

export async function crearCampania(body: CampaniaLandingRequest): Promise<CampaniaLanding> {
  const { data } = await apiClient.post<CampaniaLanding>(BASE, body);
  return data;
}

export async function actualizarCampania(
  id: number,
  body: CampaniaLandingRequest,
): Promise<CampaniaLanding> {
  const { data } = await apiClient.put<CampaniaLanding>(`${BASE}/${id}`, body);
  return data;
}

export async function publicarCampania(id: number): Promise<CampaniaLanding> {
  const { data } = await apiClient.post<CampaniaLanding>(`${BASE}/${id}/publicar`, {});
  return data;
}

export async function desactivarCampania(id: number): Promise<CampaniaLanding> {
  const { data } = await apiClient.post<CampaniaLanding>(`${BASE}/${id}/desactivar`, {});
  return data;
}

export async function eliminarCampania(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

// --------------------------------------------------------------------- público

function buildPublicUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) return `${base}${path}`;
  const pathFromBase = `${base}${path}`.replace(/\/+/g, '/');
  if (typeof window !== 'undefined') {
    return new URL(pathFromBase, window.location.origin).toString();
  }
  return pathFromBase;
}

/**
 * Campaña pública vigente. Usa fetch directo (sin interceptor de auth) para no
 * arrastrar tokens ni provocar redirecciones por 401 en una vista pública.
 * Devuelve el patrón vacío (objeto) cuando no hay campaña.
 */
export async function getCampaniaLandingPublic(): Promise<CampaniaLandingPublic> {
  const url = buildPublicUrl(API_ENDPOINTS.publicCampaniaLanding);
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(res.statusText || 'Error al obtener la campaña de la landing.');
  }
  return ((await res.json()) ?? {}) as CampaniaLandingPublic;
}
