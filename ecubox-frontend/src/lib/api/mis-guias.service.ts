import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { GuiaMaster, MiGuiaCreateRequest, MiInicioDashboard } from '@/types/guia-master';
import type { Paquete } from '@/types/paquete';

const BASE = API_ENDPOINTS.misGuias;

export async function listarMisGuias(): Promise<GuiaMaster[]> {
  const { data } = await apiClient.get<GuiaMaster[]>(BASE);
  return data;
}

export async function obtenerMiGuia(id: number): Promise<GuiaMaster> {
  const { data } = await apiClient.get<GuiaMaster>(`${BASE}/${id}`);
  return data;
}

export async function listarPiezasDeMiGuia(id: number): Promise<Paquete[]> {
  const { data } = await apiClient.get<Paquete[]>(`${BASE}/${id}/piezas`);
  return data;
}

export async function registrarMiGuia(body: MiGuiaCreateRequest): Promise<GuiaMaster> {
  const { data } = await apiClient.post<GuiaMaster>(BASE, body);
  return data;
}

export async function actualizarMiGuiaConsignatario(
  id: number,
  consignatarioId: number
): Promise<GuiaMaster> {
  const { data } = await apiClient.put<GuiaMaster>(`${BASE}/${id}/consignatario`, {
    consignatarioId,
  });
  return data;
}

export interface MiGuiaUpdateBody {
  trackingBase?: string;
  consignatarioId: number;
}

export async function actualizarMiGuia(
  id: number,
  body: MiGuiaUpdateBody
): Promise<GuiaMaster> {
  const { data } = await apiClient.put<GuiaMaster>(`${BASE}/${id}`, body);
  return data;
}

export async function eliminarMiGuia(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function obtenerMiInicioDashboard(): Promise<MiInicioDashboard> {
  const { data } = await apiClient.get<MiInicioDashboard>(`${BASE}/dashboard`);
  return data;
}
