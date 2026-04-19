import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getAgenciasDistribuidorAll,
  getAgenciaDistribuidor,
  getAgenciasDistribuidorByDistribuidorId,
  createAgenciaDistribuidor,
  updateAgenciaDistribuidor,
  deleteAgenciaDistribuidor,
  listarAgenciasDistribuidorPaginado,
} from '@/lib/api/agencias-distribuidor.service';
import type { AgenciaDistribuidorRequest } from '@/types/despacho';
import type { PageQuery } from '@/types/page';

export const AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY = ['admin', 'agencias-distribuidor'] as const;

export function useAgenciasDistribuidorAdmin() {
  return useQuery({
    queryKey: AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY,
    queryFn: getAgenciasDistribuidorAll,
  });
}

export function useAgenciasDistribuidorPaginadas(params: PageQuery = {}) {
  return useQuery({
    queryKey: [
      ...AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY,
      'page',
      params.q ?? '',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => listarAgenciasDistribuidorPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useAgenciasDistribuidorByDistribuidor(distribuidorId: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY, 'por-distribuidor', distribuidorId],
    queryFn: () => getAgenciasDistribuidorByDistribuidorId(distribuidorId!),
    enabled: distribuidorId != null && !Number.isNaN(distribuidorId),
  });
}

export function useAgenciaDistribuidorAdmin(id: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY, id],
    queryFn: () => getAgenciaDistribuidor(id!),
    enabled: id != null && !Number.isNaN(id),
  });
}

export function useCreateAgenciaDistribuidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgenciaDistribuidorRequest) => createAgenciaDistribuidor(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY }),
  });
}

export function useUpdateAgenciaDistribuidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgenciaDistribuidorRequest }) =>
      updateAgenciaDistribuidor(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY, id] });
    },
  });
}

export function useDeleteAgenciaDistribuidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAgenciaDistribuidor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIAS_DISTRIBUIDOR_ADMIN_QUERY_KEY }),
  });
}
