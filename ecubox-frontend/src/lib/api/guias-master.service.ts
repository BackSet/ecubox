import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EstadoGuiaMaster,
  GuiaMaster,
  GuiaMasterCancelarRequest,
  GuiaMasterCreateRequest,
  GuiaMasterUpdateRequest,
  GuiaMasterCerrarConFaltanteRequest,
  GuiaMasterConfirmarDespachoParcialRequest,
  GuiaMasterDashboard,
  GuiaMasterEstadoHistorial,
  GuiaMasterReabrirRequest,
  GuiaMasterRevisionRequest,
} from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';
import type { PageResponse, PageQuery } from '@/types/page';

const BASE = API_ENDPOINTS.guiasMaster;

export async function listarGuiasMaster(
  trackingBase?: string,
  estados?: EstadoGuiaMaster[]
): Promise<GuiaMaster[]> {
  const params: Record<string, string> = {};
  if (trackingBase) params.trackingBase = trackingBase;
  if (estados && estados.length > 0) params.estados = estados.join(',');
  const { data } = await apiClient.get<GuiaMaster[]>(BASE, {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return data;
}

export interface ListarGuiasMasterPageParams extends PageQuery {
  estados?: EstadoGuiaMaster[];
}

/** Listado paginado con búsqueda libre (trackingBase, consignatario, cliente). */
export async function listarGuiasMasterPaginado(
  params: ListarGuiasMasterPageParams = {}
): Promise<PageResponse<GuiaMaster>> {
  const queryParams: Record<string, string | number | undefined> = {
    q: params.q,
    page: params.page ?? 0,
    size: params.size ?? 25,
  };
  if (params.estados && params.estados.length > 0) {
    queryParams.estado = params.estados.join(',');
  }
  const { data } = await apiClient.get<PageResponse<GuiaMaster>>(`${BASE}/page`, {
    params: queryParams,
  });
  return data;
}

export async function obtenerGuiaMaster(id: number): Promise<GuiaMaster> {
  const { data } = await apiClient.get<GuiaMaster>(`${BASE}/${id}`);
  return data;
}

export async function listarPiezasDeGuiaMaster(id: number): Promise<Paquete[]> {
  const { data } = await apiClient.get<Paquete[]>(`${BASE}/${id}/piezas`);
  return data;
}

export async function crearGuiaMaster(
  body: GuiaMasterCreateRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(BASE, body);
  return data;
}

export async function actualizarGuiaMaster(
  id: number,
  body: GuiaMasterUpdateRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.patch<GuiaMaster>(`${BASE}/${id}`, body);
  return data;
}

export async function eliminarGuiaMaster(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function cerrarGuiaMasterConFaltante(
  id: number,
  body: GuiaMasterCerrarConFaltanteRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(
    `${BASE}/${id}/cerrar-con-faltante`,
    body
  );
  return data;
}

export async function recalcularEstadoGuiaMaster(id: number): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(`${BASE}/${id}/recalcular`);
  return data;
}

export async function confirmarDespachoParcialGuiaMaster(
  id: number,
  body: GuiaMasterConfirmarDespachoParcialRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(
    `${BASE}/${id}/confirmar-despacho-parcial`,
    body
  );
  return data;
}

export async function obtenerDashboardGuiasMaster(): Promise<GuiaMasterDashboard> {
  const { data } = await apiClient.get<GuiaMasterDashboard>(`${BASE}/dashboard`);
  return data;
}

export async function cancelarGuiaMaster(
  id: number,
  body: GuiaMasterCancelarRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(`${BASE}/${id}/cancelar`, body);
  return data;
}

export async function marcarGuiaMasterEnRevision(
  id: number,
  body: GuiaMasterRevisionRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(
    `${BASE}/${id}/marcar-en-revision`,
    body
  );
  return data;
}

export async function salirGuiaMasterDeRevision(
  id: number,
  body: GuiaMasterRevisionRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(
    `${BASE}/${id}/salir-de-revision`,
    body
  );
  return data;
}

export async function reabrirGuiaMaster(
  id: number,
  body: GuiaMasterReabrirRequest
): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(`${BASE}/${id}/reabrir`, body);
  return data;
}

export async function listarHistorialGuiaMaster(
  id: number
): Promise<GuiaMasterEstadoHistorial[]> {
  const { data } = await apiClient.get<GuiaMasterEstadoHistorial[]>(
    `${BASE}/${id}/historial`
  );
  return data;
}
