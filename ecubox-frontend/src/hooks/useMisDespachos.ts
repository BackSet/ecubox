import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmarEntregaDespacho,
  listarMisDespachos,
  obtenerMiDespacho,
} from '@/lib/api/mis-despachos.service';

export const MIS_DESPACHOS_QUERY_KEY = ['mis-despachos'] as const;

export function useMisDespachos() {
  return useQuery({
    queryKey: [...MIS_DESPACHOS_QUERY_KEY, 'list'],
    queryFn: () => listarMisDespachos(),
  });
}

export function useMiDespacho(despachoId: number | null | undefined) {
  return useQuery({
    queryKey: [...MIS_DESPACHOS_QUERY_KEY, 'detail', despachoId],
    queryFn: () => obtenerMiDespacho(despachoId as number),
    enabled: despachoId != null,
  });
}

export function useConfirmarEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (despachoId: number) => confirmarEntregaDespacho(despachoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MIS_DESPACHOS_QUERY_KEY] });
    },
  });
}
