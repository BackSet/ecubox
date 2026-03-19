import { useQuery } from '@tanstack/react-query';
import { getPermisos } from '@/lib/api/permiso.service';

const QUERY_KEY = ['permisos'] as const;

export function usePermisos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPermisos,
  });
}
