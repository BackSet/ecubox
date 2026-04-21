import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Agencia,
  AgenciaCourierEntrega,
  Despacho,
  DespachoCreateRequest,
  CourierEntrega,
  Saca,
  SacaCreateRequest,
  TamanioSaca,
} from '@/types/despacho';
import type { Consignatario, ConsignatarioRequest } from '@/types/consignatario';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import type { Paquete } from '@/types/paquete';
import type { PageResponse, PageQuery } from '@/types/page';

const DIST = API_ENDPOINTS.operarioCouriersEntrega;
const AGENCIAS = API_ENDPOINTS.operarioAgencias;
const DEST = API_ENDPOINTS.operarioConsignatarios;
const SACAS = API_ENDPOINTS.operarioSacas;
const DESPACHOS = API_ENDPOINTS.operarioDespachos;

export async function getCouriersEntrega(): Promise<CourierEntrega[]> {
  const { data } = await apiClient.get<CourierEntrega[]>(DIST);
  return data;
}

export async function getAgencias(): Promise<Agencia[]> {
  const { data } = await apiClient.get<Agencia[]>(AGENCIAS);
  return data;
}

export async function getAgenciasCourierEntrega(courierEntregaId: number): Promise<AgenciaCourierEntrega[]> {
  const { data } = await apiClient.get<AgenciaCourierEntrega[]>(`${DIST}/${courierEntregaId}/puntos-entrega`);
  return data;
}

/**
 * Crear punto de entrega de un courier desde el flujo operario.
 * Sin nombre, sin código y sin tarifa: el costo lo maneja Liquidaciones.
 */
export interface CreateAgenciaCourierEntregaOperarioBody {
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
}

export async function createAgenciaCourierEntregaOperario(
  courierEntregaId: number,
  body: CreateAgenciaCourierEntregaOperarioBody
): Promise<AgenciaCourierEntrega> {
  const { data } = await apiClient.post<AgenciaCourierEntrega>(
    `${DIST}/${courierEntregaId}/puntos-entrega`,
    body
  );
  return data;
}

export async function getConsignatariosOperario(params?: {
  search?: string;
}): Promise<Consignatario[]> {
  const { data } = await apiClient.get<Consignatario[]>(DEST, {
    params: params?.search ? { search: params.search } : undefined,
  });
  return data;
}

export async function getConsignatarioOperario(id: number): Promise<Consignatario> {
  const { data } = await apiClient.get<Consignatario>(`${DEST}/${id}`);
  return data;
}

export async function updateConsignatarioOperario(
  id: number,
  body: ConsignatarioRequest
): Promise<Consignatario> {
  const { data } = await apiClient.put<Consignatario>(`${DEST}/${id}`, body);
  return data;
}

export async function deleteConsignatarioOperario(id: number): Promise<void> {
  await apiClient.delete(`${DEST}/${id}`);
}

export async function getSacasOperario(params?: {
  sinDespacho?: boolean;
}): Promise<Saca[]> {
  const sinDespacho = params?.sinDespacho ?? true;
  const { data } = await apiClient.get<Saca[]>(SACAS, {
    params: { sinDespacho },
  });
  return data;
}

export async function createSaca(body: SacaCreateRequest): Promise<Saca> {
  const { data } = await apiClient.post<Saca>(SACAS, body);
  return data;
}

export async function actualizarTamanioSaca(
  sacaId: number,
  tamanio: TamanioSaca
): Promise<Saca> {
  const { data } = await apiClient.patch<Saca>(`${SACAS}/${sacaId}/tamanio`, { tamanio });
  return data;
}

/** Asignar varios paquetes a una saca. */
export async function asignarPaquetesASaca(
  sacaId: number,
  paqueteIds: number[]
): Promise<Paquete[]> {
  const { data } = await apiClient.post<Paquete[]>(
    `${SACAS}/${sacaId}/paquetes`,
    { paqueteIds }
  );
  return data;
}

export async function getDespachos(): Promise<Despacho[]> {
  const { data } = await apiClient.get<Despacho[]>(DESPACHOS);
  return data;
}

/** Listado paginado con búsqueda libre (numero, código precinto, courierEntrega, agencia, consignatario). */
export async function getDespachosPaginado(
  params: PageQuery = {}
): Promise<PageResponse<Despacho>> {
  const { data } = await apiClient.get<PageResponse<Despacho>>(`${DESPACHOS}/page`, {
    params: {
      q: params.q,
      page: params.page ?? 0,
      size: params.size ?? 25,
    },
  });
  return data;
}

/** Despacho por ID con sacas y paquetes (para ver/imprimir). */
export async function getDespachoById(id: number): Promise<Despacho> {
  const { data } = await apiClient.get<Despacho>(`${DESPACHOS}/${id}`);
  return data;
}

export async function createDespacho(
  body: DespachoCreateRequest
): Promise<Despacho> {
  const { data } = await apiClient.post<Despacho>(DESPACHOS, body);
  return data;
}

export async function updateDespacho(
  id: number,
  body: DespachoCreateRequest
): Promise<Despacho> {
  const { data } = await apiClient.put<Despacho>(`${DESPACHOS}/${id}`, body);
  return data;
}

export async function deleteDespacho(id: number): Promise<void> {
  await apiClient.delete(`${DESPACHOS}/${id}`);
}

export async function getMensajeWhatsAppDespacho(despachoId: number): Promise<{ mensaje: string }> {
  const { data } = await apiClient.get<{ mensaje: string }>(
    `${DESPACHOS}/${despachoId}/mensaje-whatsapp`
  );
  return data;
}

export interface AplicarEstadoPorPeriodoParams {
  fechaInicio: string;
  fechaFin: string;
  estadoRastreoId?: number;
}

export interface AplicarEstadoPorPeriodoResponse {
  despachosProcesados: number;
  paquetesActualizados: number;
}

/** Aplica el estado de rastreo (o el configurado en parámetros) a todos los paquetes de despachos en el periodo. */
export async function aplicarEstadoRastreoPorPeriodo(
  params: AplicarEstadoPorPeriodoParams
): Promise<AplicarEstadoPorPeriodoResponse> {
  const { data } = await apiClient.post<AplicarEstadoPorPeriodoResponse>(
    `${DESPACHOS}/aplicar-estado-por-periodo`,
    {
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
      estadoRastreoId: params.estadoRastreoId ?? null,
    }
  );
  return data;
}

export interface AplicarEstadoEnDespachosParams {
  despachoIds: number[];
  estadoRastreoId?: number;
}

/** Aplica el estado de rastreo a los paquetes de los despachos indicados (uno o varios). */
export async function aplicarEstadoRastreoEnDespachos(
  params: AplicarEstadoEnDespachosParams
): Promise<AplicarEstadoPorPeriodoResponse> {
  const { data } = await apiClient.post<AplicarEstadoPorPeriodoResponse>(
    `${DESPACHOS}/aplicar-estado-en-despachos`,
    {
      despachoIds: params.despachoIds,
      estadoRastreoId: params.estadoRastreoId ?? null,
    }
  );
  return data;
}

/** Estados activos posteriores al "estado del punto de despacho", aplicables masivamente. */
export async function getEstadosAplicablesDespacho(): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.get<EstadoRastreo[]>(`${DESPACHOS}/estados-aplicables`);
  return data;
}

