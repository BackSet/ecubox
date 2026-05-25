import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { apiClient } from '@/lib/api/client';
import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';
import {
  normalizeCanalesFromApi,
  type CanalesComunicacion,
  type CanalesComunicacionPublic,
} from '@/types/canales-comunicacion';

export interface MensajeWhatsAppDespacho {
  plantilla: string;
}

const BASE = API_ENDPOINTS.operarioMensajeWhatsAppDespacho;

export async function getMensajeWhatsAppDespacho(): Promise<MensajeWhatsAppDespacho> {
  const { data } = await apiClient.get<{ plantilla?: string }>(BASE);
  return {
    plantilla: data.plantilla ?? '',
  };
}

export async function updateMensajeWhatsAppDespacho(body: {
  plantilla: string;
}): Promise<MensajeWhatsAppDespacho> {
  const { data } = await apiClient.put<{ plantilla?: string }>(BASE, body);
  return {
    plantilla: data.plantilla ?? '',
  };
}

export interface MensajeAgenciaEeuu {
  mensaje: string;
}

export async function getMensajeAgenciaEeuu(): Promise<MensajeAgenciaEeuu> {
  const { data } = await apiClient.get<{ mensaje?: string }>(API_ENDPOINTS.configMensajeAgenciaEeuu);
  return {
    mensaje: data.mensaje ?? '',
  };
}

export async function updateMensajeAgenciaEeuu(body: {
  mensaje: string;
}): Promise<MensajeAgenciaEeuu> {
  const { data } = await apiClient.put<{ mensaje?: string }>(
    API_ENDPOINTS.operarioMensajeAgenciaEeuu,
    body
  );
  return {
    mensaje: data.mensaje ?? '',
  };
}

function getCanalesComunicacionPublicUrl(): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}/config/canales-comunicacion`;
  }
  const pathFromBase = `${base.replace(/\/+$/, '')}/config/canales-comunicacion`.replace(/\/+/g, '/');
  if (typeof window !== 'undefined') {
    return new URL(pathFromBase, window.location.origin).toString();
  }
  return pathFromBase;
}

export async function getCanalesComunicacionPublic(): Promise<CanalesComunicacionPublic> {
  const url = getCanalesComunicacionPublicUrl();
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(res.statusText || 'Error al obtener canales de comunicación.');
  }
  return (await res.json()) as CanalesComunicacionPublic;
}

export async function getCanalesComunicacion(): Promise<CanalesComunicacion> {
  const { data } = await apiClient.get<Partial<CanalesComunicacion>>(
    API_ENDPOINTS.operarioCanalesComunicacion,
  );
  return normalizeCanalesFromApi(data);
}

export async function updateCanalesComunicacion(
  body: CanalesComunicacion,
): Promise<CanalesComunicacion> {
  const { data } = await apiClient.put<Partial<CanalesComunicacion>>(
    API_ENDPOINTS.operarioCanalesComunicacion,
    body,
  );
  return normalizeCanalesFromApi(data ?? body);
}
