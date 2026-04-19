import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { PermisoDTO } from '@/types/rol';
import type { PageQuery, PageResponse } from '@/types/page';

const BASE = API_ENDPOINTS.permisos;

export async function getPermisos(): Promise<PermisoDTO[]> {
  const { data } = await apiClient.get<PermisoDTO[]>(BASE);
  return data;
}

export async function listarPermisosPaginado(
  params: PageQuery = {},
): Promise<PageResponse<PermisoDTO>> {
  const { data } = await apiClient.get<PageResponse<PermisoDTO>>(`${BASE}/page`, {
    params,
  });
  return data;
}
