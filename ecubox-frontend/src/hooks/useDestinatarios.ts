import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getDestinatarios,
  getDestinatario,
  createDestinatario,
  updateDestinatario,
  deleteDestinatario,
} from '@/lib/api/destinatarios.service';
import type { DestinatarioFinalRequest } from '@/types/destinatario';

const QUERY_KEY = ['destinatarios'] as const;

export function useDestinatarios(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getDestinatarios,
    enabled,
  });
}

export function useDestinatario(id: number | undefined | null, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getDestinatario(id!),
    enabled: enabled && id != null,
  });
}

export function useCreateDestinatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DestinatarioFinalRequest) => createDestinatario(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateDestinatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DestinatarioFinalRequest }) =>
      updateDestinatario(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}

export function useDeleteDestinatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDestinatario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
