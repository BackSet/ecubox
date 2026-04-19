import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  listarUsuariosPaginado,
} from '@/lib/api/usuario.service';
import type {
  UsuarioCreateRequest,
  UsuarioUpdateRequest,
} from '@/types/usuario';
import type { PageQuery } from '@/types/page';

const QUERY_KEY = ['usuarios'] as const;

export function useUsuarios() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getUsuarios,
  });
}

export function useUsuariosPaginados(params: PageQuery = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'page', params],
    queryFn: () => listarUsuariosPaginado(params),
    placeholderData: keepPreviousData,
  });
}

export function useUsuario(id: number | undefined | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getUsuario(id!),
    enabled: id != null,
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UsuarioCreateRequest) => createUsuario(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UsuarioUpdateRequest }) =>
      updateUsuario(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}

export function useDeleteUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUsuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
