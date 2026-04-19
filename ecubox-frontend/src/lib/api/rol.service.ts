import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { RolDTO, RolPermisosUpdateRequest } from '@/types/rol';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.roles;

export async function getRoles(): Promise<RolDTO[]> {
  const { data } = await apiClient.get<RolDTO[]>(BASE);
  return data;
}

export async function listarRolesPaginado(
  params: PageQuery = {},
): Promise<PageResponse<RolDTO>> {
  const { data } = await apiClient.get<PageResponse<RolDTO>>(`${BASE}/page`, {
    params,
  });
  return data;
}

export async function getRol(id: number): Promise<RolDTO> {
  const { data } = await apiClient.get<RolDTO>(`${BASE}/${id}`);
  return data;
}

export async function updateRolPermisos(
  id: number,
  body: RolPermisosUpdateRequest
): Promise<RolDTO> {
  const { data } = await apiClient.put<RolDTO>(`${BASE}/${id}/permisos`, body);
  return data;
}
