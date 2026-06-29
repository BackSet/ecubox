import { openapiClient, unwrap } from '@/lib/api/openapi-client';
import type { EstadisticasDashboard } from '@/types/estadisticas';
import type { EstadisticasApiParams } from '@/pages/dashboard/estadisticas/periodo';

export async function getEstadisticas(
  params: EstadisticasApiParams,
): Promise<EstadisticasDashboard> {
  const data = await unwrap(
    openapiClient.GET('/api/estadisticas', { params: { query: params } }),
  );
  return data as EstadisticasDashboard;
}
