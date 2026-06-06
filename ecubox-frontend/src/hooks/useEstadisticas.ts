import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getEstadisticas } from '@/lib/api/estadisticas.service';

export const ESTADISTICAS_QUERY_KEY = ['estadisticas'] as const;

export function useEstadisticas(meses: number) {
  return useQuery({
    queryKey: [...ESTADISTICAS_QUERY_KEY, meses],
    queryFn: () => getEstadisticas(meses),
    placeholderData: keepPreviousData,
  });
}
