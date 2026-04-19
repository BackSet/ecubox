import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Paquete, PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import type { PageResponse, PageQuery } from '@/types/page';

const BASE = API_ENDPOINTS.misPaquetes;
const OPERARIO_BASE = API_ENDPOINTS.operarioPaquetes;

export async function getPaquetes(): Promise<Paquete[]> {
  const { data } = await apiClient.get<Paquete[]>(BASE);
  return data;
}

export interface PaqueteListParams extends PageQuery {
  /** código de estado de rastreo */
  estado?: string;
  destinatarioFinalId?: number;
  /** código del envío consolidado */
  envio?: string;
  guiaMasterId?: number;
  /** uno de: 'sin_peso' | 'con_peso' | 'sin_guia_master' | 'vencidos' */
  chip?: string;
}

/** Paquetes paginados con búsqueda libre (numeroGuia, ref, contenido, guía master, envío, destinatario) y filtros. */
export async function getPaquetesPaginated(
  params: PaqueteListParams = {}
): Promise<PageResponse<Paquete>> {
  const { data } = await apiClient.get<PageResponse<Paquete>>(`${BASE}/page`, {
    params: {
      q: params.q,
      estado: params.estado,
      destinatarioFinalId: params.destinatarioFinalId,
      envio: params.envio,
      guiaMasterId: params.guiaMasterId,
      // El chip "vencidos" se sigue resolviendo en cliente; el resto va al server.
      chip: params.chip && params.chip !== 'vencidos' ? params.chip : undefined,
      page: params.page ?? 0,
      size: params.size ?? 25,
    },
  });
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

/**
 * Asignar (o desvincular) un paquete a una guía master específica (operario).
 * Pasar `guiaMasterId=null` para desvincular la pieza del master.
 */
export async function asignarPaqueteAGuiaMaster(
  paqueteId: number,
  guiaMasterId: number | null,
  piezaNumero?: number | null
): Promise<Paquete> {
  const { data } = await apiClient.patch<Paquete>(
    `${OPERARIO_BASE}/${paqueteId}/guia-master`,
    { guiaMasterId, piezaNumero }
  );
  return data;
}

/** Asignar varios paquetes como piezas de la misma guía master (operario). */
export async function asignarGuiaMasterBulk(
  guiaMasterId: number,
  paqueteIds: number[]
): Promise<Paquete[]> {
  const { data } = await apiClient.post<Paquete[]>(
    `${OPERARIO_BASE}/asignar-guia-master`,
    { guiaMasterId, paqueteIds }
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

