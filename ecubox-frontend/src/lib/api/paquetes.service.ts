import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Paquete,
  PaqueteCreateRequest,
  PaqueteUpdateRequest,
  PaqueteResumen,
} from '@/types/paquete';
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
  consignatarioId?: number;
  /** código del envío consolidado */
  envio?: string;
  guiaMasterId?: number;
  /** uno de: 'sin_peso' | 'con_peso' | 'sin_guia_master' | 'vencidos' */
  chip?: string;
}

/** Paquetes paginados con búsqueda libre (numeroGuia, ref, contenido, guía master, envío, consignatario) y filtros. */
export async function getPaquetesPaginated(
  params: PaqueteListParams = {}
): Promise<PageResponse<Paquete>> {
  const { data } = await apiClient.get<PageResponse<Paquete>>(`${BASE}/page`, {
    params: {
      q: params.q,
      estado: params.estado,
      consignatarioId: params.consignatarioId,
      envio: params.envio,
      guiaMasterId: params.guiaMasterId,
      // Todos los chips (incluido "vencidos") se resuelven server-side: el
      // vencimiento ahora es un predicado SQL sobre fecha_limite_retiro.
      chip: params.chip || undefined,
      page: params.page ?? 0,
      size: params.size ?? 25,
    },
  });
  return data;
}

export interface PaqueteResumenParams {
  q?: string;
  estado?: string;
  consignatarioId?: number;
  envio?: string;
  guiaMasterId?: number;
}

/**
 * Resumen liviano del listado de paquetes: KPIs del universo, conteos por chip
 * (respetando los filtros estructurales) y opciones distintas de filtro. Evita
 * descargar el dataset completo solo para alimentar KPIs, comboboxes y chips.
 */
export async function getPaqueteResumen(
  params: PaqueteResumenParams = {}
): Promise<PaqueteResumen> {
  const { data } = await apiClient.get<PaqueteResumen>(`${BASE}/resumen`, {
    params: {
      q: params.q,
      estado: params.estado,
      consignatarioId: params.consignatarioId,
      envio: params.envio,
      guiaMasterId: params.guiaMasterId,
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
  consignatarioId: number,
  excludePaqueteId?: number
): Promise<{ ref: string }> {
  const params = new URLSearchParams({ consignatarioId: String(consignatarioId) });
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

export interface CambiarEstadoRastreoBulkResponse {
  actualizados: number;
  rechazados: { paqueteId: number; motivo: string }[];
}

/**
 * Estados de rastreo a los que se puede mover la selección de paquetes (intersección
 * válida para todos, calculada por el backend). Para un combobox con solo destinos válidos.
 */
export async function getEstadosDestinoPermitidos(
  paqueteIds: number[],
): Promise<EstadoRastreo[]> {
  const { data } = await apiClient.post<EstadoRastreo[]>(
    `${OPERARIO_BASE}/estados-destino-permitidos`,
    { paqueteIds },
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

/** Aplica un estado de rastreo a todos los paquetes registrados en el periodo. */
export async function aplicarEstadoPorPeriodoPaquetes(params: {
  fechaInicio: string;
  fechaFin: string;
  estadoRastreoId: number;
}): Promise<CambiarEstadoRastreoBulkResponse> {
  const { data } = await apiClient.post<CambiarEstadoRastreoBulkResponse>(
    `${OPERARIO_BASE}/aplicar-estado-por-periodo`,
    params
  );
  return data;
}
