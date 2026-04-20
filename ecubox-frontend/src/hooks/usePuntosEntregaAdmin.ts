import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getAgenciasCourierEntregaAll,
  getAgenciaCourierEntrega,
  getAgenciasCourierEntregaByCourierEntregaId,
  createAgenciaCourierEntrega,
  updateAgenciaCourierEntrega,
  deleteAgenciaCourierEntrega,
  listarAgenciasCourierEntregaPaginado,
} from '@/lib/api/puntos-entrega.service';
import type { AgenciaCourierEntregaRequest } from '@/types/despacho';
import type { PageQuery } from '@/types/page';

export const AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY = ['admin', 'agencias-courierEntrega'] as const;

export function usePuntosEntregaAdmin() {
  return useQuery({
    queryKey: AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY,
    queryFn: getAgenciasCourierEntregaAll,
  });
}

export function useAgenciasCourierEntregaPaginadas(params: PageQuery = {}) {
  return useQuery({
    queryKey: [
      ...AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY,
      'page',
      params.q ?? '',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => listarAgenciasCourierEntregaPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useAgenciasCourierEntregaByCourierEntrega(courierEntregaId: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY, 'por-courierEntrega', courierEntregaId],
    queryFn: () => getAgenciasCourierEntregaByCourierEntregaId(courierEntregaId!),
    enabled: courierEntregaId != null && !Number.isNaN(courierEntregaId),
  });
}

export function useAgenciaCourierEntregaAdmin(id: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY, id],
    queryFn: () => getAgenciaCourierEntrega(id!),
    enabled: id != null && !Number.isNaN(id),
  });
}

export function useCreateAgenciaCourierEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgenciaCourierEntregaRequest) => createAgenciaCourierEntrega(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY }),
  });
}

export function useUpdateAgenciaCourierEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgenciaCourierEntregaRequest }) =>
      updateAgenciaCourierEntrega(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY, id] });
    },
  });
}

export function useDeleteAgenciaCourierEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAgenciaCourierEntrega(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIAS_COURIER_ENTREGA_ADMIN_QUERY_KEY }),
  });
}
