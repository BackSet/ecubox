import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Paquete, PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';
import type { EstadoRastreo } from '@/types/estado-rastreo';

const BASE = API_ENDPOINTS.misPaquetes;
const OPERARIO_BASE = API_ENDPOINTS.operarioPaquetes;

export async function getPaquetes(): Promise<Paquete[]> {
  const { data } = await apiClient.get<Paquete[]>(BASE);
  return data;
}

export async function createPaquete(
  body: PaqueteCreateRequest
): Promise<Paquete> {
  const { data } = await apiClient.post<Paquete>(BASE, body);
  return data;
}

export async function updatePaquete(
  id: number,
  body: PaqueteUpdateRequest
): Promise<Paquete> {
  const { data } = await apiClient.put<Paquete>(`${BASE}/${id}`, body);
  return data;
}

export async function deletePaquete(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** Sugiere una ref única para un paquete (solo admin/operario). */
export async function sugerirRef(
  destinatarioFinalId: number,
  excludePaqueteId?: number
): Promise<{ ref: string }> {
  const params = new URLSearchParams({ destinatarioFinalId: String(destinatarioFinalId) });
  if (excludePaqueteId != null) params.set('excludePaqueteId', String(excludePaqueteId));
  const { data } = await apiClient.get<{ ref: string }>(`${BASE}/sugerir-ref?${params}`);
  return data;
}

/** Lista de paquetes para operario (cargar pesos). */
export async function getPaquetesOperario(params?: {
  sinPeso?: boolean;
}): Promise<Paquete[]> {
  const sinPeso = params?.sinPeso ?? true;
  const { data } = await apiClient.get<Paquete[]>(OPERARIO_BASE, {
    params: { sinPeso },
  });
  return data;
}

/** Paquetes que superaron el plazo máximo de retiro. */
export async function getPaquetesVencidosOperario(): Promise<Paquete[]> {
  const { data } = await apiClient.get<Paquete[]>(OPERARIO_BASE, {
    params: { vencidos: true },
  });
  return data;
}

/** Paquetes sin saca asignada (disponibles para agregar a una saca). */
export async function getPaquetesSinSaca(): Promise<Paquete[]> {
  const { data } = await apiClient.get<Paquete[]>(OPERARIO_BASE, {
    params: { sinSaca: true },
  });
  return data;
}

/** Asignar o desasignar un paquete a una saca (sacaId null = quitar de saca). */
export async function asignarPaqueteSaca(
  paqueteId: number,
  sacaId: number | null
): Promise<Paquete> {
  const { data } = await apiClient.patch<Paquete>(
    `${OPERARIO_BASE}/${paqueteId}/saca`,
    { sacaId }
  );
  return data;
}

export interface PaquetePesoItem {
  paqueteId: number;
  pesoLbs?: number;
  pesoKg?: number;
}

/** Actualizar pesos de varios paquetes a la vez. */
export async function bulkUpdatePesos(
  items: PaquetePesoItem[]
): Promise<Paquete[]> {
  const { data } = await apiClient.post<Paquete[]>(
    `${OPERARIO_BASE}/pesos`,
    { items }
  );
  return data;
}

/** Actualizar estado de rastreo de un paquete (operario). */
export async function updateEstadoRastreo(
  paqueteId: number,
  estadoRastreoId: number,
  motivoAlterno?: string
): Promise<Paquete> {
  const { data } = await apiClient.patch<Paquete>(
    `${OPERARIO_BASE}/${paqueteId}/estado-rastreo`,
    { estadoRastreoId, motivoAlterno }
  );
  return data;
}

export interface CambiarEstadoRastreoBulkResponse {
  actualizados: number;
  rechazados: { paqueteId: number; motivo: string }[];
}

/** Cambiar estado de rastreo a una lista de paquetes (solo elegibles: sin lote, sin despacho). */
export async function cambiarEstadoRastreoBulk(
  paqueteIds: number[],
  estadoRastreoId: number
): Promise<CambiarEstadoRastreoBulkResponse> {
  const { data } = await apiClient.post<CambiarEstadoRastreoBulkResponse>(
    `${OPERARIO_BASE}/cambiar-estado-rastreo-bulk`,
    { paqueteIds, estadoRastreoId }
  );
  return data;
}

export async function getEstadosDestinoPermitidos(
  paqueteIds: number[]
): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.post<EstadoRastreo[]>(
    `${OPERARIO_BASE}/estados-destino-permitidos`,
    { paqueteIds }
  );
  return data;
}

/** Asignar o quitar guía de envío del consolidador en un paquete (operario). */
export async function asignarGuiaEnvio(
  paqueteId: number,
  numeroGuiaEnvio: string | null
): Promise<Paquete> {
  const { data } = await apiClient.patch<Paquete>(
    `${OPERARIO_BASE}/${paqueteId}/guia-envio`,
    { numeroGuiaEnvio }
  );
  return data;
}

/** Asignar la misma guía de envío a varios paquetes (operario). */
export async function asignarGuiaEnvioBulk(
  numeroGuiaEnvio: string | null,
  paqueteIds: number[]
): Promise<Paquete[]> {
  const { data } = await apiClient.post<Paquete[]>(
    `${OPERARIO_BASE}/asignar-guia-envio`,
    { numeroGuiaEnvio, paqueteIds }
  );
  return data;
}

/** Buscar paquetes por lista de números de guía ECUBOX (operario). */
export async function buscarPaquetesPorGuias(
  numeroGuias: string[]
): Promise<Paquete[]> {
  const { data } = await apiClient.post<Paquete[]>(
    `${OPERARIO_BASE}/buscar-por-guias`,
    { numeroGuias }
  );
  return data;
}

