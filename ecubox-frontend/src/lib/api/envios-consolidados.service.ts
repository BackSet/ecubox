import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EnvioConsolidado,
  EnvioConsolidadoCreateRequest,
  EnvioConsolidadoCreateResponse,
  EnvioConsolidadoPaquetesRequest,
} from '@/types/envio-consolidado';
import type { PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.enviosConsolidados;

/**
 * Filtro de estado para el listado.
 *
 * El backend acepta `TODOS` (default), `ABIERTO` o `CERRADO`. Internamente
 * traduce a `fecha_cerrado IS NULL/NOT NULL`. La maquina de estados antigua
 * fue eliminada.
 */
export type EstadoFiltro = 'TODOS' | 'ABIERTO' | 'CERRADO';
export type EstadoPagoFiltro = 'TODOS' | 'PAGADO' | 'NO_PAGADO';

export interface ListarEnviosParams {
  estado?: EstadoFiltro;
  estadoPago?: EstadoPagoFiltro;
  /** Búsqueda libre (LIKE multi-token) sobre el código del envío. */
  q?: string;
  page?: number;
  size?: number;
}

export async function listarEnviosConsolidados(
  params: ListarEnviosParams = {}
): Promise<PageResponse<EnvioConsolidado>> {
  const { data } = await apiClient.get<PageResponse<EnvioConsolidado>>(BASE, { params });
  return data;
}

export interface ListarDisponiblesRecepcionParams {
  /** Búsqueda libre sobre el código del envío. */
  q?: string;
  page?: number;
  size?: number;
}

/**
 * Lista los envíos consolidados que pueden registrarse en un nuevo lote de
 * recepción. A diferencia del listado general, este endpoint es ortogonal a
 * `cerrado` y `estadoPago`: incluye envíos ya liquidados y pagados, porque
 * el flujo físico USA → Ecuador es independiente del flujo administrativo.
 *
 * El backend excluye automáticamente los envíos sin paquetes y los que ya
 * están en algún otro lote de recepción.
 */
export async function listarEnviosDisponiblesParaRecepcion(
  params: ListarDisponiblesRecepcionParams = {}
): Promise<PageResponse<EnvioConsolidado>> {
  const { data } = await apiClient.get<PageResponse<EnvioConsolidado>>(
    `${BASE}/disponibles-recepcion`,
    { params }
  );
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

/**
 * Elimina definitivamente un envio consolidado.
 *
 * - {@code eliminarPaquetes=false} (default): los paquetes asociados se
 *   desasocian (FK a null) y siguen existiendo en el sistema.
 * - {@code eliminarPaquetes=true}: los paquetes se eliminan junto con el envio
 *   (irreversible, borra su tracking).
 *
 * Backend valida que el envio este abierto.
 */
export async function eliminarEnvioConsolidado(
  id: number,
  eliminarPaquetes: boolean = false,
): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, {
    params: { eliminarPaquetes },
  });
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
