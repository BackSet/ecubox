import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getAgencias,
  getAgencia,
  createAgencia,
  updateAgencia,
  deleteAgencia,
} from '@/lib/api/agencias.service';
import type { AgenciaRequest } from '@/types/despacho';

export const AGENCIAS_QUERY_KEY = ['agencias'] as const;

export function useAgencias() {
  return useQuery({
    queryKey: AGENCIAS_QUERY_KEY,
    queryFn: getAgencias,
  });
}

export function useAgencia(id: number | undefined | null) {
  return useQuery({
    queryKey: [...AGENCIAS_QUERY_KEY, id],
    queryFn: () => getAgencia(id!),
    enabled: id != null,
  });
}

export function useCreateAgencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgenciaRequest) => createAgencia(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIAS_QUERY_KEY }),
  });
}

export function useUpdateAgencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AgenciaRequest }) =>
      updateAgencia(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: AGENCIAS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...AGENCIAS_QUERY_KEY, id] });
    },
  });
}

export function useDeleteAgencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAgencia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIAS_QUERY_KEY }),
  });
}
