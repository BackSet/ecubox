import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getRoles,
  getRol,
  updateRolPermisos,
} from '@/lib/api/rol.service';
import type { RolPermisosUpdateRequest } from '@/types/rol';

const QUERY_KEY = ['roles'] as const;

export function useRoles() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getRoles,
  });
}

export function useRol(id: number | undefined | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getRol(id!),
    enabled: id != null,
  });
}

export function useUpdateRolPermisos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: RolPermisosUpdateRequest;
    }) => updateRolPermisos(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}
