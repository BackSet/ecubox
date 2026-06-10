import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EnvioConsolidado,
  EnvioConsolidadoCreateRequest,
  EnvioConsolidadoCreateResponse,
  EnvioConsolidadoPaquetesRequest,
} from '@/types/envio-consolidado';
import type { PageResponse } from '@/types/page';
import type { EstadoRastreo } from '@/types/estado-rastreo';

const BASE = API_ENDPOINTS.enviosConsolidados;

/** Filtro por estado operativo derivado del consolidado. */
export type EstadoFiltro =
  | 'TODOS'
  | 'VACIO'
  | 'EN_PREPARACION'
  | 'CERRADO'
  | 'ENVIADO_DESDE_USA'
  | 'ARRIBADO_ECUADOR'
  | 'RECIBIDO_EN_BODEGA'
  | 'LIQUIDADO'
  | 'CANCELADO';
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
 * la salida USA y el estado de pago: incluye envíos ya liquidados y pagados, porque
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

/** Cierra un envio consolidado para registro. */
export async function cerrarConsolidadoEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/cerrar-consolidado`);
  return data;
}

/** Marca un envio consolidado como enviado desde USA. */
export async function enviarDesdeUsaEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/enviar-usa`);
  return data;
}

/** Registra el arribo del envio consolidado a Ecuador. */
export async function arribarEcuadorEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/arribar-ecuador`);
  return data;
}

/** Cancela un envio consolidado. */
export async function cancelarEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/cancelar`);
  return data;
}

/** Revierte la salida USA del consolidado (set fechaCerrado = null). */
export async function reabrirEnvioConsolidado(id: number): Promise<EnvioConsolidado> {
  const { data } = await apiClient.post<EnvioConsolidado>(`${BASE}/${id}/reabrir`);
  return data;
}

export interface AplicarTransicionConsolidadosPayload {
  estadoOperativoDestino: 'CERRADO' | 'ENVIADO_DESDE_USA' | 'ARRIBADO_ECUADOR' | 'EN_PREPARACION';
  consolidadoIds?: number[];
  fechaInicio?: string;
  fechaFin?: string;
}

export interface AplicarTransicionConsolidadosResponse {
  consolidadosProcesados: number;
  rechazados: { consolidadoId: number; codigo: string; motivo: string }[];
}

/** Aplica una transición de estado operativo a consolidados (por selección o por periodo). */
export async function aplicarTransicionConsolidados(
  payload: AplicarTransicionConsolidadosPayload,
): Promise<AplicarTransicionConsolidadosResponse> {
  const { data } = await apiClient.post<AplicarTransicionConsolidadosResponse>(
    `${BASE}/aplicar-transicion-operativa`,
    payload,
  );
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
 * Backend valida que el envio no haya salido de USA.
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

export interface AplicarEstadoConsolidadosParams {
  consolidadoIds: number[];
  estadoRastreoId: number;
}

export interface AplicarEstadoConsolidadosResponse {
  consolidadosProcesados: number;
  paquetesActualizados: number;
}

export async function aplicarEstadoEnConsolidados(
  body: AplicarEstadoConsolidadosParams
): Promise<AplicarEstadoConsolidadosResponse> {
  const { data } = await apiClient.post<AplicarEstadoConsolidadosResponse>(
    `${BASE}/aplicar-estado`,
    body
  );
  return data;
}

export async function getEstadosAplicablesConsolidados(): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.get<EstadoRastreo[]>(`${BASE}/estados-aplicables`);
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
