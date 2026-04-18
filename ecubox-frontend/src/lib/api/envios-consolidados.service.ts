import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EnvioConsolidado,
  EnvioConsolidadoCreateRequest,
  EnvioConsolidadoCreateResponse,
  EnvioConsolidadoListResponse,
  EnvioConsolidadoPaquetesRequest,
} from '@/types/envio-consolidado';

const BASE = API_ENDPOINTS.enviosConsolidados;

/**
 * Filtro de estado para el listado.
 *
 * El backend acepta `TODOS` (default), `ABIERTO` o `CERRADO`. Internamente
 * traduce a `fecha_cerrado IS NULL/NOT NULL`. La maquina de estados antigua
 * fue eliminada.
 */
export type EstadoFiltro = 'TODOS' | 'ABIERTO' | 'CERRADO';

export interface ListarEnviosParams {
  estado?: EstadoFiltro;
  page?: number;
  size?: number;
}

export async function listarEnviosConsolidados(
  params: ListarEnviosParams = {}
): Promise<EnvioConsolidadoListResponse> {
  const { data } = await apiClient.get<EnvioConsolidadoListResponse>(BASE, { params });
  return data;
}

export async function obtenerEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.get<EnvioConsolidado>(`${BASE}/${id}`);
  return data;
}

export async function crearEnvioConsolidado(
  body: EnvioConsolidadoCreateRequest
): Promise<EnvioConsolidadoCreateResponse> {
  const { data } = await apiClient.post<EnvioConsolidadoCreateResponse>(BASE, body);
  return data;
}

/** Cierra un envio consolidado (set fechaCerrado = now en backend). */
export async function cerrarEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/cerrar`);
  return data;
}

/** Reabre un envio consolidado previamente cerrado (set fechaCerrado = null). */
export async function reabrirEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/reabrir`);
  return data;
}

export async function agregarPaquetesEnvioConsolidado(
  id: number,
  body: EnvioConsolidadoPaquetesRequest
): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/paquetes`, body);
  return data;
}

export async function removerPaquetesEnvioConsolidado(
  id: number,
  body: EnvioConsolidadoPaquetesRequest
): Promise<EnvioConsolidado> {
  const { data } = await apiClient.delete<EnvioConsolidado>(`${BASE}/${id}/paquetes`, {
    data: body,
  });
  return data;
}

export async function descargarManifiestoPdf(id: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/manifiesto.pdf`, {
    responseType: 'blob',
  });
  return data;
}

export async function descargarManifiestoXlsx(id: number): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/manifiesto.xlsx`, {
    responseType: 'blob',
  });
  return data;
}
