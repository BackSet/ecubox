import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCanalesComunicacion,
  getCanalesComunicacionPublic,
  updateCanalesComunicacion,
} from '@/lib/api/parametros-sistema.service';
import { hasPublicCanales, type CanalesComunicacion, type CanalesComunicacionPublic } from '@/types/canales-comunicacion';

export const CANALES_COMUNICACION_QUERY_KEY = ['config', 'canales-comunicacion'] as const;
export const CANALES_COMUNICACION_PUBLIC_QUERY_KEY = ['config', 'canales-comunicacion', 'public'] as const;

export function useCanalesComunicacion(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CANALES_COMUNICACION_QUERY_KEY,
    queryFn: getCanalesComunicacion,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateCanalesComunicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CanalesComunicacion) => updateCanalesComunicacion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANALES_COMUNICACION_QUERY_KEY });
      qc.invalidateQueries({ queryKey: CANALES_COMUNICACION_PUBLIC_QUERY_KEY });
    },
  });
}

export function useCanalesComunicacionPublic(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CANALES_COMUNICACION_PUBLIC_QUERY_KEY,
    queryFn: getCanalesComunicacionPublic,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/** Canales visibles en el sitio público (valor + visible en backend). */
export function usePublicCanalesDisponibles(options?: { enabled?: boolean }) {
  const query = useCanalesComunicacionPublic(options);
  const canales = query.data;
  const hasCanales = canales != null && hasPublicCanales(canales);

  return {
    ...query,
    canales: hasCanales ? (canales as CanalesComunicacionPublic) : undefined,
    hasCanales,
  };
}
