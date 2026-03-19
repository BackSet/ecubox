import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { PermisoDTO } from '@/types/rol';

export async function getPermisos(): Promise<PermisoDTO[]> {
  const { data } = await apiClient.get<PermisoDTO[]>(API_ENDPOINTS.permisos);
  return data;
}
