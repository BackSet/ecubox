import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getEstadisticas } from '@/lib/api/estadisticas.service';
import type { EstadisticasApiParams } from '@/pages/dashboard/estadisticas/periodo';

export const ESTADISTICAS_QUERY_KEY = ['estadisticas'] as const;

/**
 * La query key incluye el rango y la granularidad resueltos, de modo que cada
 * combinación de periodo se cachea por separado y la URL es la fuente de verdad.
 */
export function useEstadisticas(params: EstadisticasApiParams) {
  return useQuery({
    queryKey: [...ESTADISTICAS_QUERY_KEY, params],
    queryFn: () => getEstadisticas(params),
    placeholderData: keepPreviousData,
  });
}
