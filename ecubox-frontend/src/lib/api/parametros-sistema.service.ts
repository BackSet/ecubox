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

function buildPublicConfigUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}${path}`;
  }
  const pathFromBase = `${base.replace(/\/+$/, '')}${path}`.replace(/\/+/g, '/');
  if (typeof window !== 'undefined') {
    return new URL(pathFromBase, window.location.origin).toString();
  }
  return pathFromBase;
}

export async function getCanalesComunicacionPublic(): Promise<CanalesComunicacionPublic> {
  const url = buildPublicConfigUrl('/config/canales-comunicacion');
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(res.statusText || 'Error al obtener canales de comunicación.');
  }
  return (await res.json()) as CanalesComunicacionPublic;
}

export interface TemaTemporadaVentana {
  diasAntes?: number;
  diasDespues?: number;
}

export interface TemaTemporada {
  /** 'auto' | 'off' | id de temporada. */
  override: string;
  /** Ventanas de activación configuradas por id de temporada. */
  ventanas: Record<string, TemaTemporadaVentana>;
}

function normalizeTema(data: Partial<TemaTemporada> | null | undefined): TemaTemporada {
  return {
    override: data?.override ?? 'auto',
    ventanas: data?.ventanas ?? {},
  };
}

export async function getTemaTemporadaPublic(): Promise<TemaTemporada> {
  const url = buildPublicConfigUrl('/config/tema-temporada');
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(res.statusText || 'Error al obtener el tema de temporada.');
  }
  return normalizeTema((await res.json()) as Partial<TemaTemporada>);
}

export async function getTemaTemporada(): Promise<TemaTemporada> {
  const { data } = await apiClient.get<Partial<TemaTemporada>>(API_ENDPOINTS.operarioTemaTemporada);
  return normalizeTema(data);
}

export async function updateTemaTemporada(body: {
  override: string;
  ventanas: Record<string, TemaTemporadaVentana>;
}): Promise<TemaTemporada> {
  const { data } = await apiClient.put<Partial<TemaTemporada>>(
    API_ENDPOINTS.operarioTemaTemporada,
    body,
  );
  return normalizeTema(data);
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
