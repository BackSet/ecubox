import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getConsignatarios,
  getConsignatario,
  createConsignatario,
  updateConsignatario,
  deleteConsignatario,
} from '@/lib/api/consignatarios.service';
import type { ConsignatarioRequest } from '@/types/consignatario';

const QUERY_KEY = ['consignatarios'] as const;

export function useConsignatarios(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getConsignatarios,
    enabled,
  });
}

export function useConsignatario(id: number | undefined | null, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getConsignatario(id!),
    enabled: enabled && id != null,
  });
}

export function useCreateConsignatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConsignatarioRequest) => createConsignatario(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateConsignatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ConsignatarioRequest }) =>
      updateConsignatario(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}

export function useDeleteConsignatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConsignatario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
