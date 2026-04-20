import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { CourierEntrega, CourierEntregaRequest } from '@/types/despacho';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.couriersEntrega;

export async function getCouriersEntregaAdmin(): Promise<CourierEntrega[]> {
  const { data } = await apiClient.get<CourierEntrega[]>(BASE);
  return data;
}

export async function listarCouriersEntregaPaginado(
  params: PageQuery = {},
): Promise<PageResponse<CourierEntrega>> {
  const { data } = await apiClient.get<PageResponse<CourierEntrega>>(
    `${BASE}/page`,
    { params },
  );
  return data;
}

export async function getCourierEntregaAdmin(id: number): Promise<CourierEntrega> {
  const { data } = await apiClient.get<CourierEntrega>(`${BASE}/${id}`);
  return data;
}

export async function createCourierEntrega(body: CourierEntregaRequest): Promise<CourierEntrega> {
  const { data } = await apiClient.post<CourierEntrega>(BASE, body);
  return data;
}

export async function updateCourierEntrega(
  id: number,
  body: CourierEntregaRequest
): Promise<CourierEntrega> {
  const { data } = await apiClient.put<CourierEntrega>(`${BASE}/${id}`, body);
  return data;
}

export async function deleteCourierEntrega(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
