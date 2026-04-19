import {
  keepPreviousData,
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
  listarAgenciasPaginado,
} from '@/lib/api/agencias.service';
import type { AgenciaRequest } from '@/types/despacho';
import type { PageQuery } from '@/types/page';

export const AGENCIAS_QUERY_KEY = ['agencias'] as const;

export function useAgencias() {
  return useQuery({
    queryKey: AGENCIAS_QUERY_KEY,
    queryFn: getAgencias,
  });
}

export function useAgenciasPaginadas(params: PageQuery = {}) {
  // Usamos una tupla explícita en vez del objeto `params` para que la
  // queryKey solo cambie cuando los valores cambien realmente. Si pasáramos
  // el objeto entero, una nueva referencia en cada render invalidaría la
  // cache y dispararía refetchs/loadings innecesarios.
  return useQuery({
    queryKey: [
      ...AGENCIAS_QUERY_KEY,
      'page',
      params.q ?? '',
      params.page ?? 0,
      params.size ?? 25,
    ] as const,
    queryFn: () => listarAgenciasPaginado(params),
    placeholderData: keepPreviousData,
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
