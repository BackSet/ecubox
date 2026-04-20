import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getPaquetes,
  getPaquetesPaginated,
  createPaquete,
  updatePaquete,
  deletePaquete,
  type PaqueteListParams,
} from '@/lib/api/paquetes.service';
import type { PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';

const QUERY_KEY = ['paquetes'] as const;

export function usePaquetes() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPaquetes,
  });
}

/** Versión paginada con búsqueda servidor + filtros. Usar para tablas con muchas filas. */
export function usePaquetesPaginated(params: PaqueteListParams) {
  return useQuery({
    queryKey: [
      'paquetes',
      'page',
      params.q ?? '',
      params.estado ?? '',
      params.consignatarioId ?? '',
      params.envio ?? '',
      params.guiaMasterId ?? '',
      params.chip ?? '',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => getPaquetesPaginated(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PaqueteCreateRequest) => createPaquete(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdatePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PaqueteUpdateRequest }) =>
      updatePaquete(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeletePaquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePaquete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
