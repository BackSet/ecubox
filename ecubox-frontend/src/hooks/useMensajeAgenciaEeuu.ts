import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMensajeAgenciaEeuu, updateMensajeAgenciaEeuu } from '@/lib/api/parametros-sistema.service';

export const MENSAJE_AGENCIA_EEUU_QUERY_KEY = ['config', 'mensaje-agencia-eeuu'] as const;

export function useMensajeAgenciaEeuu(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MENSAJE_AGENCIA_EEUU_QUERY_KEY,
    queryFn: getMensajeAgenciaEeuu,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateMensajeAgenciaEeuu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mensaje: string }) => updateMensajeAgenciaEeuu(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENSAJE_AGENCIA_EEUU_QUERY_KEY });
    },
  });
}
