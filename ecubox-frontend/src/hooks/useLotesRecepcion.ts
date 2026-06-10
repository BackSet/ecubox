import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getLotesRecepcion,
  getLotesRecepcionPaginated,
  getLoteRecepcionResumen,
  getLoteRecepcionById,
  createLoteRecepcion,
  addGuiasToLoteRecepcion,
  deleteLoteRecepcion,
  type LoteRecepcionListParams,
} from '@/lib/api/lotes-recepcion.service';
import type { LoteRecepcionCreateRequest } from '@/types/lote-recepcion';

export const LOTES_RECEPCION_QUERY_KEY = ['operario', 'lotes-recepcion'] as const;

export function useLotesRecepcion() {
  return useQuery({
    queryKey: LOTES_RECEPCION_QUERY_KEY,
    queryFn: getLotesRecepcion,
  });
}

/** Listado paginado server-side con búsqueda, filtro por operario y rango de fechas. */
export function useLotesRecepcionPaginated(params: LoteRecepcionListParams) {
  return useQuery({
    queryKey: [...LOTES_RECEPCION_QUERY_KEY, 'page', params],
    queryFn: () => getLotesRecepcionPaginated(params),
    placeholderData: keepPreviousData,
  });
}

/** Resumen liviano (KPIs + operarios distintos) del listado de lotes. */
export function useLoteRecepcionResumen() {
  return useQuery({
    queryKey: [...LOTES_RECEPCION_QUERY_KEY, 'resumen'],
    queryFn: getLoteRecepcionResumen,
    placeholderData: keepPreviousData,
  });
}

export function useLoteRecepcion(id: number | undefined) {
  return useQuery({
    queryKey: [...LOTES_RECEPCION_QUERY_KEY, id],
    queryFn: () => getLoteRecepcionById(id!),
    enabled: id != null && !Number.isNaN(id),
  });
}

export function useCreateLoteRecepcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoteRecepcionCreateRequest) => createLoteRecepcion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOTES_RECEPCION_QUERY_KEY });
    },
  });
}

export function useAddGuiasToLoteRecepcion(loteId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (numeroGuiasEnvio: string[]) =>
      addGuiasToLoteRecepcion(loteId!, numeroGuiasEnvio),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOTES_RECEPCION_QUERY_KEY });
      if (loteId != null) {
        qc.invalidateQueries({ queryKey: [...LOTES_RECEPCION_QUERY_KEY, loteId] });
      }
    },
  });
}

export function useDeleteLoteRecepcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteLoteRecepcion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LOTES_RECEPCION_QUERY_KEY });
    },
  });
}
