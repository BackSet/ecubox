import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { EstadisticasDashboard } from '@/types/estadisticas';

export async function getEstadisticas(
  meses: number,
): Promise<EstadisticasDashboard> {
  const { data } = await apiClient.get<EstadisticasDashboard>(
    API_ENDPOINTS.estadisticas,
    { params: { meses } },
  );
  return data;
}
