import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { EstadisticasDashboard } from '@/types/estadisticas';
import type { EstadisticasApiParams } from '@/pages/dashboard/estadisticas/periodo';

export async function getEstadisticas(
  params: EstadisticasApiParams,
): Promise<EstadisticasDashboard> {
  const { data } = await apiClient.get<EstadisticasDashboard>(API_ENDPOINTS.estadisticas, {
    params,
  });
  return data;
}
