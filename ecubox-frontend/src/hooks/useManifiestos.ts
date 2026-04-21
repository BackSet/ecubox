import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getManifiestos,
  getManifiesto,
  createManifiesto,
  updateManifiesto,
  deleteManifiesto,
  asignarDespachos,
  getDespachosCandidatosManifiesto,
} from '@/lib/api/manifiestos.service';
import type {
  ManifiestoRequest,
  AsignarDespachosRequest,
} from '@/types/manifiesto';

export const MANIFIESTOS_QUERY_KEY = ['manifiestos'] as const;

export function useManifiestos() {
  return useQuery({
    queryKey: MANIFIESTOS_QUERY_KEY,
    queryFn: getManifiestos,
  });
}

export function useManifiesto(id: number | undefined | null) {
  return useQuery({
    queryKey: [...MANIFIESTOS_QUERY_KEY, id],
    queryFn: () => getManifiesto(id!),
    enabled: id != null,
  });
}

export function useCreateManifiesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManifiestoRequest) => createManifiesto(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: MANIFIESTOS_QUERY_KEY }),
  });
}

export function useUpdateManifiesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ManifiestoRequest }) =>
      updateManifiesto(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: MANIFIESTOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...MANIFIESTOS_QUERY_KEY, id] });
      qc.invalidateQueries({
        queryKey: [...MANIFIESTOS_QUERY_KEY, id, 'despachos-candidatos'],
      });
    },
  });
}

export function useDeleteManifiesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteManifiesto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MANIFIESTOS_QUERY_KEY }),
  });
}

export function useAsignarDespachos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AsignarDespachosRequest }) =>
      asignarDespachos(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: MANIFIESTOS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...MANIFIESTOS_QUERY_KEY, id] });
    },
  });
}

export function useDespachosCandidatosManifiesto(id: number | undefined | null) {
  return useQuery({
    queryKey: [...MANIFIESTOS_QUERY_KEY, id, 'despachos-candidatos'],
    queryFn: () => getDespachosCandidatosManifiesto(id!),
    enabled: id != null,
  });
}
