import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getCouriersEntregaAdmin,
  getCourierEntregaAdmin,
  createCourierEntrega,
  updateCourierEntrega,
  deleteCourierEntrega,
  listarCouriersEntregaPaginado,
} from '@/lib/api/couriers-entrega.service';
import type { CourierEntregaRequest } from '@/types/despacho';
import type { PageQuery } from '@/types/page';

export const COURIERS_ENTREGA_ADMIN_QUERY_KEY = ['couriersEntrega'] as const;

export function useCouriersEntregaAdmin() {
  return useQuery({
    queryKey: COURIERS_ENTREGA_ADMIN_QUERY_KEY,
    queryFn: getCouriersEntregaAdmin,
  });
}

export function useCouriersEntregaPaginados(params: PageQuery = {}) {
  return useQuery({
    queryKey: [
      ...COURIERS_ENTREGA_ADMIN_QUERY_KEY,
      'page',
      params.q ?? '',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => listarCouriersEntregaPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useCourierEntregaAdmin(id: number | undefined | null) {
  return useQuery({
    queryKey: [...COURIERS_ENTREGA_ADMIN_QUERY_KEY, id],
    queryFn: () => getCourierEntregaAdmin(id!),
    enabled: id != null,
  });
}

export function useCreateCourierEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CourierEntregaRequest) => createCourierEntrega(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: COURIERS_ENTREGA_ADMIN_QUERY_KEY }),
  });
}

export function useUpdateCourierEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CourierEntregaRequest }) =>
      updateCourierEntrega(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: COURIERS_ENTREGA_ADMIN_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...COURIERS_ENTREGA_ADMIN_QUERY_KEY, id] });
    },
  });
}

export function useDeleteCourierEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCourierEntrega(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: COURIERS_ENTREGA_ADMIN_QUERY_KEY }),
  });
}
