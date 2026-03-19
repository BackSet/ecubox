import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPaquetes,
  createPaquete,
  updatePaquete,
  deletePaquete,
} from '@/lib/api/paquetes.service';
import type { PaqueteCreateRequest, PaqueteUpdateRequest } from '@/types/paquete';

const QUERY_KEY = ['paquetes'] as const;

export function usePaquetes() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPaquetes,
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
