import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getDistribuidoresAdmin,
  getDistribuidorAdmin,
  createDistribuidor,
  updateDistribuidor,
  deleteDistribuidor,
  listarDistribuidoresPaginado,
} from '@/lib/api/distribuidores.service';
import type { DistribuidorRequest } from '@/types/despacho';
import type { PageQuery } from '@/types/page';

export const DISTRIBUIDORES_ADMIN_QUERY_KEY = ['distribuidores'] as const;

export function useDistribuidoresAdmin() {
  return useQuery({
    queryKey: DISTRIBUIDORES_ADMIN_QUERY_KEY,
    queryFn: getDistribuidoresAdmin,
  });
}

export function useDistribuidoresPaginados(params: PageQuery = {}) {
  return useQuery({
    queryKey: [...DISTRIBUIDORES_ADMIN_QUERY_KEY, 'page', params],
    queryFn: () => listarDistribuidoresPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useDistribuidorAdmin(id: number | undefined | null) {
  return useQuery({
    queryKey: [...DISTRIBUIDORES_ADMIN_QUERY_KEY, id],
    queryFn: () => getDistribuidorAdmin(id!),
    enabled: id != null,
  });
}

export function useCreateDistribuidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DistribuidorRequest) => createDistribuidor(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISTRIBUIDORES_ADMIN_QUERY_KEY }),
  });
}

export function useUpdateDistribuidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DistribuidorRequest }) =>
      updateDistribuidor(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: DISTRIBUIDORES_ADMIN_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...DISTRIBUIDORES_ADMIN_QUERY_KEY, id] });
    },
  });
}

export function useDeleteDistribuidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDistribuidor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISTRIBUIDORES_ADMIN_QUERY_KEY }),
  });
}
