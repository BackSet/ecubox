import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  GuiaMaster,
  GuiaMasterCreateRequest,
  GuiaMasterUpdateRequest,
  GuiaMasterCerrarConFaltanteRequest,
  GuiaMasterConfirmarDespachoParcialRequest,
  GuiaMasterDashboard,
} from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';

const BASE = API_ENDPOINTS.guiasMaster;

export async function listarGuiasMaster(trackingBase?: string): Promise<GuiaMaster[]> {
  const { data } = await apiClient.get<GuiaMaster[]>(BASE, {
    params: trackingBase ? { trackingBase } : undefined,
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
