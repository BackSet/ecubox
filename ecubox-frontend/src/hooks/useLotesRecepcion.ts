import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLotesRecepcion,
  getLoteRecepcionById,
  createLoteRecepcion,
  addGuiasToLoteRecepcion,
} from '@/lib/api/lotes-recepcion.service';
import type { LoteRecepcionCreateRequest } from '@/types/lote-recepcion';

export const LOTES_RECEPCION_QUERY_KEY = ['operario', 'lotes-recepcion'] as const;

export function useLotesRecepcion() {
  return useQuery({
    queryKey: LOTES_RECEPCION_QUERY_KEY,
    queryFn: getLotesRecepcion,
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
