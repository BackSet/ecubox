import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPermisos, listarPermisosPaginado } from '@/lib/api/permiso.service';
import type { PageQuery } from '@/types/page';

const QUERY_KEY = ['permisos'] as const;

export function usePermisos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPermisos,
  });
}

export function usePermisosPaginados(params: PageQuery = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'page', params],
    queryFn: () => listarPermisosPaginado(params),
    placeholderData: keepPreviousData,
  });
}
