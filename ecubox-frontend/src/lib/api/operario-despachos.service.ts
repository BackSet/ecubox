import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Agencia,
  AgenciaDistribuidor,
  Despacho,
  DespachoCreateRequest,
  Distribuidor,
  Saca,
  SacaCreateRequest,
  TamanioSaca,
} from '@/types/despacho';
import type { DestinatarioFinal, DestinatarioFinalRequest } from '@/types/destinatario';
import type { Paquete } from '@/types/paquete';

const DIST = API_ENDPOINTS.operarioDistribuidores;
const AGENCIAS = API_ENDPOINTS.operarioAgencias;
const DEST = API_ENDPOINTS.operarioDestinatarios;
const SACAS = API_ENDPOINTS.operarioSacas;
const DESPACHOS = API_ENDPOINTS.operarioDespachos;

export async function getDistribuidores(): Promise<Distribuidor[]> {
  const { data } = await apiClient.get<Distribuidor[]>(DIST);
  return data;
}

export async function getAgencias(): Promise<Agencia[]> {
  const { data } = await apiClient.get<Agencia[]>(AGENCIAS);
  return data;
}

export async function getAgenciasDistribuidor(distribuidorId: number): Promise<AgenciaDistribuidor[]> {
  const { data } = await apiClient.get<AgenciaDistribuidor[]>(`${DIST}/${distribuidorId}/agencias-distribuidor`);
  return data;
}

/** Crear agencia de distribuidor desde flujo operario (sin nombre ni código; provincia/cantón opcionales). */
export interface CreateAgenciaDistribuidorOperarioBody {
  provincia?: string;
  canton?: string;
  direccion?: string;
  horarioAtencion?: string;
  diasMaxRetiro?: number;
  tarifa: number;
}

export async function createAgenciaDistribuidorOperario(
  distribuidorId: number,
  body: CreateAgenciaDistribuidorOperarioBody
): Promise<AgenciaDistribuidor> {
  const { data } = await apiClient.post<AgenciaDistribuidor>(
    `${DIST}/${distribuidorId}/agencias-distribuidor`,
    body
  );
  return data;
}

export async function getDestinatariosOperario(params?: {
  search?: string;
}): Promise<DestinatarioFinal[]> {
  const { data } = await apiClient.get<DestinatarioFinal[]>(DEST, {
    params: params?.search ? { search: params.search } : undefined,
  });
  return data;
}

export async function getDestinatarioOperario(id: number): Promise<DestinatarioFinal> {
  const { data } = await apiClient.get<DestinatarioFinal>(`${DEST}/${id}`);
  return data;
}

export async function updateDestinatarioOperario(
  id: number,
  body: DestinatarioFinalRequest
): Promise<DestinatarioFinal> {
  const { data } = await apiClient.put<DestinatarioFinal>(`${DEST}/${id}`, body);
  return data;
}

export async function deleteDestinatarioOperario(id: number): Promise<void> {
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

